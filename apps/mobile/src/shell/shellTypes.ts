import type {
  EnvironmentId,
  OrchestrationProjectShell,
  OrchestrationThreadShell,
  ServerProvider,
} from "@vipercode/contracts";

export interface ScopedProject {
  readonly environmentId: EnvironmentId;
  readonly id: string;
  readonly title: string;
  readonly workspaceRoot: string;
}

export interface ScopedThread {
  readonly environmentId: EnvironmentId;
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: string;
  readonly hasPendingApprovals: boolean;
  readonly hasPendingUserInput: boolean;
  readonly hasActionableProposedPlan: boolean;
  readonly updatedAt: string;
}

export interface ProviderModelInfo {
  readonly slug: string;
  readonly name: string;
  readonly shortName: string | null;
  readonly subProvider: string | null;
  readonly isCustom: boolean;
  readonly availability: "available" | "unavailable" | null;
  readonly unavailableReason: string | null;
}

export interface ProviderInfo {
  readonly instanceId: string;
  readonly displayName: string;
  readonly driver: string;
  readonly accentColor: string | null;
  readonly enabled: boolean;
  readonly installed: boolean;
  readonly status: "ready" | "warning" | "error" | "disabled";
  readonly availability: "available" | "unavailable";
  readonly models: ReadonlyArray<ProviderModelInfo>;
  readonly authStatus: string | null;
  readonly message: string | null;
}

export interface ShellState {
  readonly projects: ReadonlyArray<ScopedProject>;
  readonly threads: ReadonlyArray<ScopedThread>;
  readonly providers: ReadonlyArray<ProviderInfo>;
  readonly isPending: boolean;
  readonly error: string | null;
}

export function shellStateFromSnapshot(
  environmentId: EnvironmentId,
  projects: ReadonlyArray<OrchestrationProjectShell>,
  threads: ReadonlyArray<OrchestrationThreadShell>,
): ShellState {
  return {
    projects: projects.map((p) => ({
      environmentId,
      id: p.id,
      title: p.title,
      workspaceRoot: p.workspaceRoot,
    })),
    threads: threads.map((t) => ({
      environmentId,
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      status: t.session?.status ?? (t.latestTurn ? "ready" : "idle"),
      hasPendingApprovals: t.hasPendingApprovals,
      hasPendingUserInput: t.hasPendingUserInput,
      hasActionableProposedPlan: t.hasActionableProposedPlan,
      updatedAt: t.updatedAt,
    })),
    providers: [],
    isPending: false,
    error: null,
  };
}

export function providerInfoFromServerProviders(
  providers: ReadonlyArray<ServerProvider>,
): ReadonlyArray<ProviderInfo> {
  return providers.map((p) => ({
    instanceId: p.instanceId,
    displayName: p.displayName ?? p.driver,
    driver: p.driver,
    accentColor: p.accentColor ?? null,
    enabled: p.enabled,
    installed: p.installed,
    status: p.status,
    availability: p.availability ?? "available",
    models: p.models.map((m) => ({
      slug: m.slug,
      name: m.name,
      shortName: m.shortName ?? null,
      subProvider: m.subProvider ?? null,
      isCustom: m.isCustom,
      availability: m.availability ?? null,
      unavailableReason: m.unavailableReason ?? null,
    })),
    authStatus: p.auth?.status ?? null,
    message: p.message ?? null,
  }));
}

export const EMPTY_SHELL_STATE: ShellState = {
  projects: [],
  threads: [],
  providers: [],
  isPending: true,
  error: null,
};
