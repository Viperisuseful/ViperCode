/**
 * AcpProviderAdapter — a generic `ProviderAdapterShape` that drives any
 * external **Agent Client Protocol** (ACP) agent CLI.
 *
 * Where `ClaudeAdapter` wraps the Anthropic Agent SDK and `CodexAdapter` wraps
 * the Codex app-server, this adapter spawns one ACP agent process per thread
 * (e.g. `copilot --acp`) via {@link AcpSessionRuntime}, translates the agent's
 * `session/update` stream into canonical `ProviderRuntimeEvent`s with the
 * shared {@link module:provider/acp/AcpCoreRuntimeEvents} builders, and bridges
 * `session/request_permission` into ViperCode's approval flow. The result is a
 * fully agentic provider — file reads, edits, shell, and approvals — using the
 * exact runtime events the web UI already renders for Codex/Claude.
 *
 * It is intentionally agent-agnostic: a binding supplies the spawn invocation
 * (binary, args, env) and identity via {@link AcpProviderAdapterOptions}, so the
 * same adapter can back GitHub Copilot today and other ACP agents later.
 *
 * @module provider/acp/AcpProviderAdapter
 */
import {
  ApprovalRequestId,
  EventId,
  type ProviderApprovalDecision,
  type ProviderDriverKind,
  type ProviderInstanceId,
  type ProviderRuntimeEvent,
  type ProviderSendTurnInput,
  type ProviderSession,
  type ProviderSessionStartInput,
  type ProviderTurnStartResult,
  RuntimeRequestId,
  type ThreadId,
  TurnId,
} from "@vipercode/contracts";
import { getModelSelectionStringOptionValue } from "@vipercode/shared/model";
import * as Clock from "effect/Clock";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import { ChildProcessSpawner } from "effect/unstable/process";
import type * as EffectAcpSchema from "effect-acp/schema";

import type { ProviderAdapterError } from "../Errors.ts";
import type { ProviderAdapterShape, ProviderThreadSnapshot } from "../Services/ProviderAdapter.ts";
import { mapAcpToAdapterError } from "./AcpAdapterSupport.ts";
import {
  makeAcpAssistantItemEvent,
  makeAcpContentDeltaEvent,
  makeAcpPlanUpdatedEvent,
  makeAcpRequestOpenedEvent,
  makeAcpRequestResolvedEvent,
  makeAcpToolCallEvent,
} from "./AcpCoreRuntimeEvents.ts";
import { parsePermissionRequest, type AcpParsedSessionEvent } from "./AcpRuntimeModel.ts";
import {
  AcpSessionRuntime,
  type AcpSessionRuntimeShape,
  type AcpSpawnInput,
} from "./AcpSessionRuntime.ts";

export interface AcpProviderAdapterOptions {
  /** Driver kind stamped on every emitted event (e.g. `githubCopilot`). */
  readonly provider: ProviderDriverKind;
  /** Instance this adapter is bound to; stamped on events for routing. */
  readonly instanceId: ProviderInstanceId;
  /** Client identity reported to the agent during ACP `initialize`. */
  readonly clientInfo: { readonly name: string; readonly version: string };
  /** Model used when a turn carries no explicit selection. */
  readonly defaultModel?: string | undefined;
  /**
   * Build the per-session spawn invocation. Called once per `startSession`
   * with the resolved working directory and model so the binding can pass
   * `--model`, `--add-dir`, auth env, etc. Returns an `Effect` so bindings can
   * read fresh credentials (e.g. a token that was stored after the adapter was
   * built) at session start.
   */
  readonly buildSpawn: (input: {
    readonly cwd: string;
    readonly model: string | undefined;
    readonly reasoningEffort: string | undefined;
  }) => Effect.Effect<AcpSpawnInput>;
}

interface PendingApproval {
  readonly deferred: Deferred.Deferred<ProviderApprovalDecision>;
}

interface AcpThreadSession {
  session: ProviderSession;
  readonly runtime: AcpSessionRuntimeShape;
  readonly scope: Scope.Closeable;
  readonly pendingApprovals: Map<ApprovalRequestId, PendingApproval>;
  model: string | undefined;
  activeTurnId: TurnId | undefined;
}

function turnStateFromStopReason(
  stopReason: EffectAcpSchema.StopReason,
): "completed" | "cancelled" {
  return stopReason === "cancelled" ? "cancelled" : "completed";
}

/**
 * Map a ViperCode approval decision onto an ACP permission response by picking
 * the offered option whose `kind` matches the user's intent. ACP requires the
 * client to echo back one of the agent-provided `optionId`s.
 */
function selectPermissionResponse(
  options: EffectAcpSchema.RequestPermissionRequest["options"],
  decision: ProviderApprovalDecision,
): EffectAcpSchema.RequestPermissionResponse {
  if (decision === "cancel") {
    return { outcome: { outcome: "cancelled" } };
  }
  const preference: ReadonlyArray<EffectAcpSchema.PermissionOption["kind"]> =
    decision === "decline"
      ? ["reject_once", "reject_always"]
      : decision === "acceptForSession"
        ? ["allow_always", "allow_once"]
        : ["allow_once", "allow_always"];
  for (const kind of preference) {
    const match = options.find((option) => option.kind === kind);
    if (match) {
      return { outcome: { outcome: "selected", optionId: match.optionId } };
    }
  }
  const fallback = options[0];
  return fallback
    ? { outcome: { outcome: "selected", optionId: fallback.optionId } }
    : { outcome: { outcome: "cancelled" } };
}

export const makeAcpProviderAdapter = (
  options: AcpProviderAdapterOptions,
): Effect.Effect<
  ProviderAdapterShape<ProviderAdapterError>,
  never,
  ChildProcessSpawner.ChildProcessSpawner | Scope.Scope
> =>
  Effect.gen(function* () {
    const { provider, instanceId } = options;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const events = yield* Queue.unbounded<ProviderRuntimeEvent>();
    const sessions = new Map<ThreadId, AcpThreadSession>();
    const counter = yield* Ref.make(0);

    const nowIso = Effect.map(DateTime.now, DateTime.formatIso);
    const nextSeq = Ref.modify(counter, (n) => [n + 1, n + 1] as const);

    const makeEventStamp = (): Effect.Effect<{
      readonly eventId: EventId;
      readonly createdAt: string;
    }> =>
      Effect.gen(function* () {
        const seq = yield* nextSeq;
        const nowMs = yield* Clock.currentTimeMillis;
        const createdAt = yield* nowIso;
        return { eventId: EventId.make(`acp-${nowMs}-${seq}`), createdAt };
      });

    // `ProviderService` stamps the originating instance id onto every event it
    // reads from `streamEvents`, so emitters leave `providerInstanceId` unset.
    const offer = (event: ProviderRuntimeEvent): Effect.Effect<void> =>
      Queue.offer(events, event).pipe(Effect.asVoid);

    const resolveModelSelection = (
      modelSelection: ProviderSessionStartInput["modelSelection"],
    ): { readonly model: string | undefined; readonly reasoningEffort: string | undefined } => {
      const selection = modelSelection?.instanceId === instanceId ? modelSelection : undefined;
      return {
        model: selection?.model ?? options.defaultModel,
        reasoningEffort: getModelSelectionStringOptionValue(selection, "reasoningEffort"),
      };
    };

    // Translate one parsed ACP session event into a canonical runtime event.
    // Returns `undefined` for events we intentionally drop (e.g. mode changes).
    const translateEvent = (
      threadId: ThreadId,
      event: AcpParsedSessionEvent,
    ): Effect.Effect<ProviderRuntimeEvent | undefined> =>
      Effect.gen(function* () {
        const turnId = sessions.get(threadId)?.activeTurnId;
        const stamp = yield* makeEventStamp();
        switch (event._tag) {
          case "AssistantItemStarted":
          case "AssistantItemCompleted":
            return makeAcpAssistantItemEvent({
              stamp,
              provider,
              threadId,
              turnId,
              itemId: event.itemId,
              lifecycle:
                event._tag === "AssistantItemCompleted" ? "item.completed" : "item.started",
            });
          case "ContentDelta":
            return makeAcpContentDeltaEvent({
              stamp,
              provider,
              threadId,
              turnId,
              ...(event.itemId ? { itemId: event.itemId } : {}),
              text: event.text,
              rawPayload: event.rawPayload,
            });
          case "ToolCallUpdated":
            return makeAcpToolCallEvent({
              stamp,
              provider,
              threadId,
              turnId,
              toolCall: event.toolCall,
              rawPayload: event.rawPayload,
            });
          case "PlanUpdated":
            return makeAcpPlanUpdatedEvent({
              stamp,
              provider,
              threadId,
              turnId,
              payload: event.payload,
              source: "acp.jsonrpc",
              method: "session/update",
              rawPayload: event.rawPayload,
            });
          case "ModeChanged":
            return undefined;
        }
      });

    const makePermissionHandler =
      (threadId: ThreadId) => (request: EffectAcpSchema.RequestPermissionRequest) =>
        Effect.gen(function* () {
          const seq = yield* nextSeq;
          const nowMs = yield* Clock.currentTimeMillis;
          const requestIdValue = `acp-req-${nowMs}-${seq}`;
          const approvalId = ApprovalRequestId.make(requestIdValue);
          const permissionRequest = parsePermissionRequest(request);
          const deferred = yield* Deferred.make<ProviderApprovalDecision>();

          const entry = sessions.get(threadId);
          entry?.pendingApprovals.set(approvalId, { deferred });

          const openedStamp = yield* makeEventStamp();
          yield* offer(
            makeAcpRequestOpenedEvent({
              stamp: openedStamp,
              provider,
              threadId,
              turnId: entry?.activeTurnId,
              requestId: RuntimeRequestId.make(requestIdValue),
              permissionRequest,
              detail:
                permissionRequest.detail ??
                permissionRequest.toolCall?.title ??
                "Permission requested",
              args: request.toolCall.rawInput,
              source: "acp.jsonrpc",
              method: "session/request_permission",
              rawPayload: request,
            }),
          );

          const decision = yield* Deferred.await(deferred);
          entry?.pendingApprovals.delete(approvalId);

          const resolvedStamp = yield* makeEventStamp();
          yield* offer(
            makeAcpRequestResolvedEvent({
              stamp: resolvedStamp,
              provider,
              threadId,
              turnId: entry?.activeTurnId,
              requestId: RuntimeRequestId.make(requestIdValue),
              permissionRequest,
              decision,
            }),
          );

          return selectPermissionResponse(request.options, decision);
        });

    const startSession = (
      startInput: ProviderSessionStartInput,
    ): Effect.Effect<ProviderSession, ProviderAdapterError> =>
      Effect.gen(function* () {
        const threadId = startInput.threadId;
        const cwd = startInput.cwd ?? process.cwd();
        const { model, reasoningEffort } = resolveModelSelection(startInput.modelSelection);
        const spawn = yield* options.buildSpawn({ cwd, model, reasoningEffort });

        const sessionScope = yield* Scope.make("sequential");

        const session = yield* Effect.gen(function* () {
          const runtimeContext = yield* Layer.build(
            AcpSessionRuntime.layer({
              spawn,
              cwd,
              clientInfo: options.clientInfo,
            }),
          ).pipe(
            Effect.provideService(Scope.Scope, sessionScope),
            Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
          );
          const runtime = yield* Effect.service(AcpSessionRuntime).pipe(
            Effect.provide(runtimeContext),
          );

          yield* runtime.handleRequestPermission(makePermissionHandler(threadId));
          yield* runtime.start();

          const createdAt = yield* nowIso;
          const providerSession: ProviderSession = {
            provider,
            providerInstanceId: instanceId,
            status: "ready",
            runtimeMode: startInput.runtimeMode,
            threadId,
            cwd,
            ...(model ? { model } : {}),
            createdAt,
            updatedAt: createdAt,
          };

          const entry: AcpThreadSession = {
            session: providerSession,
            runtime,
            scope: sessionScope,
            pendingApprovals: new Map(),
            model,
            activeTurnId: undefined,
          };
          sessions.set(threadId, entry);

          // Pump the agent's session/update stream into runtime events for the
          // life of the session. Forked into the session scope so it is torn
          // down with the child process on stopSession/adapter teardown.
          yield* Stream.runForEach(runtime.getEvents(), (acpEvent) =>
            translateEvent(threadId, acpEvent).pipe(
              Effect.flatMap((event) => (event ? offer(event) : Effect.void)),
            ),
          ).pipe(Effect.forkIn(sessionScope));

          return providerSession;
        }).pipe(
          Effect.mapError((error) =>
            mapAcpToAdapterError(provider, threadId, "session/new", error),
          ),
          Effect.onError(() => Scope.close(sessionScope, Exit.void).pipe(Effect.ignore)),
        );

        return session;
      });

    const runPrompt = (
      entry: AcpThreadSession,
      input: ProviderSendTurnInput,
      turnId: TurnId,
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        const text = input.input?.trim() ?? "";
        const promptBlocks: ReadonlyArray<EffectAcpSchema.ContentBlock> =
          text.length > 0 ? [{ type: "text", text }] : [];

        const result = yield* entry.runtime.prompt({ prompt: promptBlocks }).pipe(Effect.result);

        const completedStamp = yield* makeEventStamp();
        if (Result.isFailure(result)) {
          yield* offer({
            type: "turn.completed",
            ...completedStamp,
            provider,
            threadId: entry.session.threadId,
            turnId,
            payload: {
              state: "failed",
              errorMessage: result.failure.message || "GitHub Copilot turn failed.",
            },
          });
        } else {
          const stopReason = result.success.stopReason;
          yield* offer({
            type: "turn.completed",
            ...completedStamp,
            provider,
            threadId: entry.session.threadId,
            turnId,
            payload: {
              state: turnStateFromStopReason(stopReason),
              ...(stopReason ? { stopReason } : {}),
            },
          });
        }

        entry.activeTurnId = undefined;
        entry.session = {
          ...entry.session,
          status: "ready",
          activeTurnId: undefined,
          updatedAt: yield* nowIso,
        };
      });

    const sendTurn = (
      input: ProviderSendTurnInput,
    ): Effect.Effect<ProviderTurnStartResult, ProviderAdapterError> =>
      Effect.gen(function* () {
        const seq = yield* nextSeq;
        const nowMs = yield* Clock.currentTimeMillis;
        const turnId = TurnId.make(`acp-turn-${nowMs}-${seq}`);
        const entry = sessions.get(input.threadId);
        if (!entry) {
          return { threadId: input.threadId, turnId };
        }

        const selection =
          input.modelSelection?.instanceId === instanceId ? input.modelSelection : undefined;
        if (selection?.model && selection.model !== entry.model) {
          // Best-effort in-session model switch; a fresh session already spawns
          // with the right `--model`, so failures here are non-fatal.
          yield* entry.runtime.setModel(selection.model).pipe(Effect.ignore);
          entry.model = selection.model;
        }

        entry.activeTurnId = turnId;
        entry.session = {
          ...entry.session,
          status: "running",
          activeTurnId: turnId,
          updatedAt: yield* nowIso,
        };

        const startedStamp = yield* makeEventStamp();
        yield* offer({
          type: "turn.started",
          ...startedStamp,
          provider,
          threadId: input.threadId,
          turnId,
          payload: entry.model ? { model: entry.model } : {},
        });

        yield* runPrompt(entry, input, turnId).pipe(Effect.forkIn(entry.scope));
        return { threadId: input.threadId, turnId };
      });

    const cancelPendingApprovals = (entry: AcpThreadSession): Effect.Effect<void> =>
      Effect.forEach(
        Array.from(entry.pendingApprovals.values()),
        (pending) => Deferred.succeed(pending.deferred, "cancel"),
        { discard: true },
      ).pipe(Effect.andThen(Effect.sync(() => entry.pendingApprovals.clear())));

    const interruptTurn = (threadId: ThreadId): Effect.Effect<void, ProviderAdapterError> =>
      Effect.gen(function* () {
        const entry = sessions.get(threadId);
        if (!entry) {
          return;
        }
        yield* cancelPendingApprovals(entry);
        yield* entry.runtime.cancel.pipe(
          Effect.mapError((error) =>
            mapAcpToAdapterError(provider, threadId, "session/cancel", error),
          ),
        );
      });

    const respondToRequest = (
      threadId: ThreadId,
      requestId: ApprovalRequestId,
      decision: ProviderApprovalDecision,
    ): Effect.Effect<void, ProviderAdapterError> =>
      Effect.gen(function* () {
        const pending = sessions.get(threadId)?.pendingApprovals.get(requestId);
        // Tolerate a late/duplicate response (the deferred is single-shot and
        // the handler removes it once resolved); resolving again is a no-op.
        if (pending) {
          yield* Deferred.succeed(pending.deferred, decision);
        }
      });

    const closeSession = (threadId: ThreadId): Effect.Effect<void> =>
      Effect.gen(function* () {
        const entry = sessions.get(threadId);
        if (!entry) {
          return;
        }
        sessions.delete(threadId);
        yield* cancelPendingApprovals(entry);
        yield* Scope.close(entry.scope, Exit.void).pipe(Effect.ignore);
      });

    const stopAll = (): Effect.Effect<void> =>
      Effect.forEach(Array.from(sessions.keys()), closeSession, { discard: true });

    const emptyThread = (threadId: ThreadId): ProviderThreadSnapshot => ({ threadId, turns: [] });

    // Tear down every live agent process if the adapter itself is released.
    yield* Effect.addFinalizer(() => stopAll());

    return {
      provider,
      capabilities: { sessionModelSwitch: "in-session" },
      startSession,
      sendTurn,
      interruptTurn,
      respondToRequest,
      respondToUserInput: () => Effect.void,
      stopSession: closeSession,
      listSessions: () =>
        Effect.sync(() => Array.from(sessions.values(), (entry) => entry.session)),
      hasSession: (threadId) => Effect.sync(() => sessions.has(threadId)),
      readThread: (threadId) => Effect.succeed(emptyThread(threadId)),
      rollbackThread: (threadId) => Effect.succeed(emptyThread(threadId)),
      stopAll,
      streamEvents: Stream.fromQueue(events),
    } satisfies ProviderAdapterShape<ProviderAdapterError>;
  });
