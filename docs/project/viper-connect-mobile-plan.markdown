# Viper Connect Mobile App Implementation Plan

## Metadata

- Author: Codex
- Date: 2026-06-13
- Status: Draft
- Target milestone: Android-compatible APK MVP, followed by production hardening
- Primary packages: `apps/mobile`, `apps/web`, `apps/server`, `packages/client-runtime`, `packages/contracts`, `packages/shared`, `infra/relay`
- Verification gate: `vp check` and `vp run typecheck` must pass before implementation tasks are considered complete. Mobile-code tasks must also pass `vp run lint:mobile` once that script exists.

## One-Sentence Goal

Build a Viper Code mobile app for Android that can discover, pair with, and control a user's Viper Code desktop/server environment through Viper Connect, while sharing the same product model, auth model, runtime contracts, and as much UI/domain logic as practical with the existing web app.

## Current Repo Reality

The repository already contains a strong remote-access foundation:

- `apps/web/src/components/settings/ConnectionsSettings.tsx` already has network access, authorized clients, remote environments, SSH launch, Tailscale endpoint selection, and Viper Connect cloud-link UI.
- `docs/user/remote-access.md` documents pairing, network access, hosted web pairing, Tailscale, SSH launch, and session-based access.
- `docs/cloud/viper-connect-clerk.md` defines Clerk setup for web, desktop, mobile, CLI OAuth, relay URL injection, and mobile waitlist behavior.
- `docs/architecture/remote.md` already defines `ExecutionEnvironment`, `KnownEnvironment`, `AccessEndpoint`, `AdvertisedEndpoint`, and the key decision that clients talk to a Viper server over HTTP/WebSocket.
- `packages/client-runtime` already exports React Native-compatible entry points and contains connection, managed relay, DPoP, websocket, known environment, thread detail, shell snapshot, and remote helpers.
- `infra/relay` already has Viper Connect environment discovery, managed endpoint APIs, relay auth, and mobile device registration infrastructure.
- `apps/mobile` exists, but it is effectively unscaffolded. It currently has no `package.json`, no Expo app, no Android build config, and no app code.
- `docs/README.md` points to `docs/mobile/app.md`, but that file does not currently exist.

The right plan is not to create a separate mobile backend. The app should be another client of the same environment protocol, using Viper Connect as the durable account/device layer and existing pairing/session flows as the local trust bridge.

## Product Principles

1. The phone is a Viper Code client, not a second control plane.
2. The PC/server remains the execution boundary for projects, providers, terminals, git, filesystem, and agent sessions.
3. Viper Connect should remove link remembering, not replace pairing security.
4. Mobile must reconnect reliably after app backgrounding, network changes, server restarts, and relay-token renewal.
5. Android APK support is the first target. iOS-specific notification and Live Activity work remains optional follow-up.
6. The mobile UI should feel like Viper Code on a phone, not a generic webview shell.

## Target User Flow

### First-Time Setup

1. User runs Viper Code on their PC.
2. User opens `Settings > Connections`.
3. User sees a clearer `Viper Connect` area.
4. User signs in or confirms their Viper Connect account.
5. User enables Viper Connect for the current environment.
6. User installs the Android APK.
7. User opens the mobile app and signs into the same Viper Connect account.
8. The mobile app lists linked Viper Code environments.
9. User taps the PC environment.
10. The app connects over the managed endpoint and loads the same projects, threads, messages, model controls, pending approvals, and task status.

### Local Pairing Fallback

1. If Viper Connect is unavailable, user can still scan a QR code or paste a pairing link from `Settings > Connections`.
2. The mobile app exchanges the one-time pairing credential directly with the reachable backend.
3. The app saves a local session credential and connects like the web client.

### Daily Use

1. User opens the app.
2. App restores the last selected environment.
3. App reconnects automatically.
4. User opens an existing thread or starts a new one.
5. User sends a message on their own behalf.
6. User can handle pending approvals and pending user input.
7. User can inspect output, diffs, changed files, and task status.

## Functional Requirements

### Viper Connect Settings on Desktop/Web

- FR-1: The Connections tab MUST expose a first-class `Viper Connect` area that explains whether the current environment is linked to the signed-in account.
- FR-2: The `Viper Connect` area MUST let an authorized user link and unlink the current environment through the existing relay flow.
- FR-3: The `Viper Connect` area MUST show mobile-relevant state: linked account, environment label, relay status, last connection status, and any connected or registered mobile devices when available.
- FR-4: The `Viper Connect` area SHOULD preserve the existing authorized-client management for direct pairing sessions.
- FR-5: The `Viper Connect` area SHOULD provide a mobile bootstrap action: QR code, APK link placeholder, and fallback pairing link.
- FR-6: The settings UI MUST not expose Viper Connect controls when required public config is absent.

### Android App Shell

- FR-7: The repo MUST contain a real `apps/mobile` package with Expo/React Native source, Android build config, scripts, and TypeScript config.
- FR-8: The mobile app MUST build an Android-compatible APK for local installation.
- FR-9: The mobile app MUST use the canonical `VIPERCODE_*` public environment config through `EXPO_PUBLIC_*` build-time injection.
- FR-10: The app MUST support portrait phone layouts first and MAY support tablets later.
- FR-11: The mobile app MUST have app identity assets matching Viper Code branding.

### Mobile Authentication

- FR-12: The mobile app MUST support Clerk sign-in for Viper Connect accounts.
- FR-13: The app MUST handle signed-out, waitlist, signed-in, and auth-error states.
- FR-14: The app MUST request relay tokens using the same Clerk JWT template and audience documented for Viper Connect.
- FR-15: The app MUST store auth/session state using secure platform storage where secrets are involved.
- FR-16: The app MUST not store pairing tokens after exchange.

### Environment Discovery and Connection

- FR-17: The app MUST list Viper Connect environments linked to the signed-in account.
- FR-18: The app MUST connect to a selected managed relay environment through the existing managed relay and DPoP flow.
- FR-19: The app MUST support manual pairing through QR scan or pasted pairing URL as a fallback.
- FR-20: The app MUST persist known environments locally and reconnect on app launch.
- FR-21: The app MUST show per-environment connection state: disconnected, connecting, connected, reconnecting, auth required, and error.
- FR-22: The app MUST recover from expired managed relay credentials by renewing through the relay when possible.
- FR-23: The app MUST handle direct LAN or Tailscale URLs when the phone can reach them.

### Core Chat and Control UX

- FR-24: The app MUST show projects, threads, thread status, messages, tool activity, pending approvals, pending user input, changed files, and proposed plans using the same contracts as the web app.
- FR-25: The app MUST let the user send messages to an active thread.
- FR-26: The app MUST let the user create a new thread in a selected project/environment.
- FR-27: The app MUST support model/provider selection where the server exposes multiple options.
- FR-28: The app MUST support approval actions and pending user input actions because those are essential for controlling a running agent.
- FR-29: The app SHOULD support image/file attachments after the MVP message path is stable.
- FR-30: The app SHOULD support terminal viewing before terminal input. Terminal input is higher risk and can follow once auth and UX guardrails are strong.

### Shared Runtime and UI Strategy

- FR-31: Mobile MUST reuse `packages/client-runtime` for websocket RPC, reconnect, known environments, managed relay, DPoP, and thread/detail state wherever possible.
- FR-32: Shared contract changes MUST live in `packages/contracts` and remain schema-only.
- FR-33: Shared runtime logic that is needed by both web and mobile MUST move to `packages/client-runtime` or `packages/shared`.
- FR-34: Web-only UI components MUST not be imported into the mobile app directly.
- FR-35: Mobile-specific views MAY wrap shared pure logic extracted from web components.

### Notifications

- FR-36: Android push notifications SHOULD be designed after the MVP app can connect and control environments.
- FR-37: Notification registration MUST use relay-side device registration APIs, not direct server-to-device secrets.
- FR-38: The first Android notification milestone SHOULD cover task finished, task blocked, approval needed, and user input needed.

### Distribution

- FR-39: The repo MUST provide a repeatable local APK build command.
- FR-40: Release artifacts SHOULD be documented before public distribution.
- FR-41: Production release SHOULD use EAS or another repeatable CI-backed Android build path.

## Non-Functional Requirements

- NFR-1: Reconnect after app foregrounding SHOULD complete within 3 seconds when the server and relay are reachable.
- NFR-2: Sending a mobile message MUST be idempotent or guarded against duplicate submission during reconnect/retry.
- NFR-3: Mobile connection code MUST tolerate partial streams, dropped websocket connections, and app background suspension.
- NFR-4: No long-lived environment session token may be stored in plaintext AsyncStorage.
- NFR-5: Pairing credentials MUST be treated like passwords and removed after session exchange.
- NFR-6: Mobile screens MUST remain usable on 360px wide Android devices.
- NFR-7: Mobile list rendering MUST use virtualized lists for messages, threads, projects, and file trees.
- NFR-8: The app MUST not poll aggressively in the background.
- NFR-9: The app SHOULD keep memory bounded when viewing long threads.
- NFR-10: The app MUST pass `vp run typecheck`; mobile work MUST pass mobile lint once configured.

## Key Architecture Decision

Use Expo/React Native for `apps/mobile`, not a WebView-only wrapper.

Reasoning:

- The user wants the same UI and behavior, but the app needs native storage, QR scanning, Android packaging, background/foreground lifecycle handling, deep links, and future push notifications.
- A WebView wrapper would be fast initially but weak for secure credentials, native connection handling, notification registration, and APK-quality UX.
- Existing packages already point toward React Native support through `packages/client-runtime` exports.

This does not mean duplicating all web UI logic. The plan is to extract logic and state machines out of web components, then build native mobile views around them.

## Proposed Package Layout

```text
apps/mobile/
  app.json
  babel.config.js
  eas.json
  package.json
  tsconfig.json
  src/
    app/
      App.tsx
      navigation/
      providers/
    auth/
    connections/
    environments/
    chat/
    settings/
    components/
    storage/
    runtime/
    theme/
    testing/

packages/client-runtime/
  existing shared connection/runtime modules
  new mobile-safe storage adapters where needed

packages/contracts/
  schema-only additions for mobile device status if required

docs/mobile/
  app.md
  android-build.md
```

## Data Model Additions and Reuse

Prefer reuse first:

- Reuse `RelayClientEnvironmentRecord` for Viper Connect environment listings.
- Reuse `SavedEnvironmentRecord` concept from web, but move cross-client shape to `packages/client-runtime` if mobile needs the same persistence rules.
- Reuse `AdvertisedEndpoint` for LAN, Tailscale, tunnel, and hosted endpoint metadata.
- Reuse auth scopes in `packages/contracts/src/auth.ts`.
- Reuse remote pairing target parsing from `@vipercode/shared/remote`.

Potential additions:

```ts
type MobileKnownEnvironmentRecord = {
  readonly version: 1;
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly httpBaseUrl: string;
  readonly wsBaseUrl: string;
  readonly createdAt: string;
  readonly lastConnectedAt: string | null;
  readonly relayManaged?: {
    readonly relayUrl: string;
  };
};

type MobileConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "requires-auth"
  | "error";

type MobileDeviceRegistration = {
  readonly deviceId: string;
  readonly platform: "android";
  readonly label: string;
  readonly appVersion: string;
  readonly pushToken: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};
```

## API Contracts to Reuse

The app should use existing contracts first:

- Relay environment list and status APIs through `ManagedRelayClient`.
- Managed endpoint connect APIs through `packages/client-runtime`.
- Direct environment descriptor fetch through `fetchRemoteEnvironmentDescriptor`.
- Pairing credential exchange through `bootstrapRemoteBearerSession`.
- WebSocket RPC through `createWsRpcClient`.
- Orchestration subscriptions for snapshots and domain events.
- Thread/project/provider/source-control contracts from `packages/contracts`.

Only add APIs if the current relay cannot answer mobile-specific needs:

```ts
type RegisterAndroidDeviceRequest = {
  readonly deviceId: string;
  readonly label: string;
  readonly appVersion: string;
  readonly pushToken: string | null;
};

type RegisterAndroidDeviceResponse = {
  readonly deviceId: string;
  readonly registeredAt: string;
};
```

## Security Model

- Mobile sign-in identifies the user to Viper Connect.
- Environment ownership remains proven by linking the environment from an already authorized local/desktop session.
- Mobile connects to linked environments through relay-issued environment access credentials and DPoP proof where managed relay is used.
- Manual pairing is still one-time token exchange into a session credential.
- Revocation must work from existing authorized-client and Viper Connect unlink flows.
- Android local storage must split public metadata from secrets.
- Secrets should use `expo-secure-store` or equivalent native secure storage.
- Logs must redact pairing tokens, bearer tokens, DPoP material, Clerk tokens, relay access tokens, and endpoint credentials.

## Acceptance Criteria

- AC-1: Given a linked desktop environment and a signed-in mobile user, when the Android app opens, then the environment appears in the mobile environment list. Covers FR-12, FR-14, FR-17.
- AC-2: Given a listed Viper Connect environment, when the user taps it, then the app connects through the existing managed relay flow and receives the server config snapshot. Covers FR-18, FR-21, FR-22.
- AC-3: Given a direct pairing QR code from desktop Connections, when the user scans it in the app, then the app exchanges the credential, saves the environment, and connects without asking for the token again. Covers FR-19, FR-20.
- AC-4: Given a connected environment with existing threads, when the user opens the app, then projects and threads render with the same statuses as web. Covers FR-24.
- AC-5: Given an active thread, when the user sends a message from mobile, then the message appears in the thread and is submitted once. Covers FR-25 and NFR-2.
- AC-6: Given a running task that asks for approval, when the mobile user approves or denies it, then the server receives the correct action and the UI updates from the next orchestration event. Covers FR-28.
- AC-7: Given the app is backgrounded and then foregrounded, when the server is reachable, then the app reconnects without losing selected environment/thread state. Covers NFR-1, NFR-3.
- AC-8: Given an expired managed relay credential, when renewal succeeds, then the app reconnects without manual re-pairing. Covers FR-22.
- AC-9: Given Viper Connect public config is absent, when desktop Connections renders, then Viper Connect account/relay controls are omitted or disabled with clear fallback pairing controls. Covers FR-6.
- AC-10: Given a clean checkout, when mobile dependencies are installed and the build command runs, then an Android APK is produced. Covers FR-7, FR-8, FR-39.

## Edge Cases

- EC-1: Phone and PC are on different networks and no Viper Connect relay is enabled.
- EC-2: Phone can reach LAN HTTP, but hosted HTTPS web pairing would be mixed-content blocked.
- EC-3: Desktop environment was unlinked while mobile app was open.
- EC-4: Mobile user signs out while a websocket is active.
- EC-5: Clerk token expires while relay credential renewal is in flight.
- EC-6: Pairing token is expired, revoked, already used, malformed, or belongs to a different environment.
- EC-7: Server restarts and returns a new advertised endpoint set.
- EC-8: App resumes after Android killed it in the background.
- EC-9: A long thread produces enough messages/tool events to stress memory and rendering.
- EC-10: User taps send during reconnect.
- EC-11: User switches environments while a task is running.
- EC-12: Mobile app and server versions drift and contract decoding fails.
- EC-13: Relay is reachable but the managed endpoint is not.
- EC-14: QR scan succeeds but the backend host is unreachable from the phone.
- EC-15: Secure storage read/write fails.

## Out of Scope for the First MVP

- OS-1: Running agents locally on the phone.
- OS-2: Editing files with a full mobile code editor.
- OS-3: Starting the PC/server from the phone when Viper Code is not already running.
- OS-4: Full terminal input support.
- OS-5: Offline thread editing or queued offline sends.
- OS-6: iOS release, APNs, and Live Activities.
- OS-7: Play Store release automation.
- OS-8: Replacing existing pairing links.
- OS-9: Building a separate mobile-specific backend.

## Implementation Plan

### Phase 0: Spec Approval and Baseline Audit

Task 0.1: Confirm MVP scope.

- Decide Android-only for first release.
- Confirm Expo/React Native as the app framework.
- Confirm Viper Connect account sign-in plus manual pairing fallback.
- Confirm terminal input is out of MVP.

Task 0.2: Audit current Viper Connect flow.

- Trace `ConnectionsSettings.tsx` Viper Connect rows.
- Trace `connectManagedCloudEnvironment`, `linkPrimaryEnvironmentToCloud`, and `managedRelayState`.
- Trace relay APIs used by `ManagedRelayClient`.
- Trace credential persistence in web runtime.
- Output a small implementation map before code starts.

Task 0.3: Audit client-runtime mobile readiness.

- Check modules for browser-only globals.
- Identify storage assumptions.
- Identify websocket assumptions.
- Identify React DOM assumptions.
- Create a list of modules that can be imported by React Native as-is.

Task 0.4: Add or update docs index.

- Create `docs/mobile/app.md`.
- Link the detailed plan from it.
- Fix the existing docs README mobile link if needed.

Done when:

- The team can point to exact modules that mobile will reuse.
- The MVP scope is frozen.
- No mobile code has started before the scope is clear.

### Phase 1: Mobile App Scaffold

Task 1.1: Create `apps/mobile/package.json`.

- Add Expo, React Native, TypeScript, Clerk Expo, navigation, secure storage, QR scanner, safe area, gesture handler, and test dependencies.
- Add scripts:
  - `dev`
  - `android`
  - `typecheck`
  - `lint`
  - `test`
  - `build:android:local`

Task 1.2: Add Expo config.

- Add `app.json` or `app.config.ts`.
- Configure Android package id.
- Configure app name, icon, splash screen, scheme, permissions, and version.
- Add public Viper Connect config mapping.

Task 1.3: Add TypeScript config.

- Extend repo base config where possible.
- Configure React Native/Expo module resolution.
- Verify workspace imports for `@vipercode/client-runtime`, `@vipercode/contracts`, and `@vipercode/shared`.

Task 1.4: Add minimal app entry.

- Render a basic native screen.
- Add safe-area provider.
- Add navigation container.
- Add runtime providers.
- Add error boundary.

Task 1.5: Add Android local build path.

- Configure EAS or local Gradle-compatible Expo build.
- Document how to produce an APK.
- Keep Play Store distribution out of scope.

Done when:

- `vp run --filter @vipercode/mobile typecheck` passes.
- A local Android dev build launches.
- A local APK build command is documented, even if not yet wired into root scripts.

### Phase 2: Shared Mobile Runtime Adapter

Task 2.1: Create mobile storage adapters.

- Public environment metadata can use AsyncStorage or SQLite.
- Secrets must use secure storage.
- Implement a small storage interface in mobile code first.
- Promote only stable cross-client interfaces to `packages/client-runtime`.

Task 2.2: Wire mobile runtime context.

- Create an Effect runtime or equivalent adapter matching the web runtime needs.
- Provide `ManagedRelayClient`.
- Provide DPoP signer dependencies.
- Provide fetch/websocket compatibility for React Native.

Task 2.3: Validate client-runtime imports.

- Import known environment helpers.
- Import managed relay helpers.
- Import websocket RPC helpers.
- Import thread detail manager where available.
- Fix browser-only leaks by extracting adapters, not by adding mobile conditionals everywhere.

Task 2.4: Add runtime tests.

- Test credential persistence boundaries.
- Test known environment serialization.
- Test relay session bootstrap with mocked fetch.
- Test websocket URL resolution.

Done when:

- Mobile can compile against shared runtime.
- Secrets and public metadata have explicit storage boundaries.
- No React DOM or browser-only code is pulled into the mobile bundle.

### Phase 3: Mobile Auth

Task 3.1: Add Clerk provider.

- Configure Clerk publishable key from public config.
- Add signed-out, waitlist, signed-in, and loading states.
- Use native Clerk flows where possible.

Task 3.2: Add relay token acquisition.

- Use the configured JWT template.
- Store only what must be stored.
- Redact token logs.

Task 3.3: Add account screen.

- Show signed-in account.
- Add sign out.
- Add waitlist or access-request screen if account is not approved.

Task 3.4: Add auth tests.

- Mock signed-out state.
- Mock signed-in state.
- Mock missing public config.
- Mock token failure.

Done when:

- Mobile can sign in to Viper Connect.
- Mobile can obtain relay auth material.
- Signing out tears down active environment connections and clears sensitive credentials.

### Phase 4: Viper Connect Environment List

Task 4.1: Build environment list query.

- Reuse `createManagedRelayQueryManager`.
- List linked environments for the signed-in account.
- Include loading, empty, error, and refresh states.

Task 4.2: Build environment row UI.

- Show label.
- Show connection/reachability status.
- Show last connected or last seen when available.
- Show whether this is the current environment.

Task 4.3: Add connect action.

- On tap, request managed environment connection.
- Save environment metadata.
- Save managed credential securely.
- Enter connecting state.

Task 4.4: Add disconnect/remove actions.

- Disconnect local websocket.
- Remove local saved credential.
- Do not unlink the server-side environment unless explicitly requested and authorized.

Task 4.5: Add empty state.

- Tell users to open Viper Code on PC and enable Viper Connect under Connections.
- Provide manual pairing fallback.

Done when:

- Signed-in mobile users can see linked environments.
- Tapping an environment establishes a saved environment record and begins connection.

### Phase 5: Manual Pairing Fallback

Task 5.1: Add QR scanner.

- Request camera permission.
- Scan Viper pairing URLs.
- Parse hosted and direct pairing forms.

Task 5.2: Add paste/manual entry.

- Paste full pairing URL.
- Enter host plus pairing code.
- Validate and normalize with shared remote parsing.

Task 5.3: Exchange pairing credential.

- Fetch environment descriptor.
- Exchange pairing token for bearer session.
- Save environment metadata and credential.

Task 5.4: Improve desktop Connections bootstrap UI.

- In the desktop/web Connections page, make `Viper Connect` mobile setup obvious.
- Keep existing direct pairing and authorized clients.
- Add copy and QR states that are clear for Android.

Done when:

- A phone can pair without Viper Connect using QR or paste.
- The user does not need to remember links after successful pairing.

### Phase 6: Environment Connection Lifecycle

Task 6.1: Create mobile environment connection service.

- Track active connections by environment id.
- Reconnect on foreground.
- Disconnect on sign out.
- Refresh metadata.
- Apply server config snapshots.

Task 6.2: Implement app lifecycle handling.

- Use React Native AppState.
- Pause unnecessary work in background.
- Reconnect when foregrounded.
- Debounce reconnect attempts.

Task 6.3: Implement network change handling.

- Use network status events.
- Retry when the phone comes back online.
- Surface offline state without clearing saved credentials.

Task 6.4: Implement credential renewal.

- Renew managed relay credentials on auth failures when possible.
- Fall back to `requires-auth` if renewal fails.

Task 6.5: Add lifecycle tests.

- Foreground reconnect.
- Expired credential renewal.
- Sign-out teardown.
- Network offline/online.

Done when:

- The app survives normal phone lifecycle events without losing environment state.
- Reconnect errors are visible and actionable.

### Phase 7: Mobile Shell Data and Navigation

Task 7.1: Build app navigation.

- Environment list.
- Project/thread list.
- Thread detail.
- Settings.
- Account.

Task 7.2: Sync environment shell snapshot.

- Projects.
- Thread summaries.
- Provider status.
- Server config.
- Pending counts.

Task 7.3: Build project/thread list.

- Use virtualized list.
- Group by environment when multiple are saved.
- Show running, blocked, idle, stopped, and error state.

Task 7.4: Build thread selection persistence.

- Remember last environment.
- Remember last thread.
- Restore on app launch if still valid.

Done when:

- A connected mobile app can browse the same projects and threads the web app sees.

### Phase 8: Chat Thread MVP

Task 8.1: Render messages.

- User messages.
- Assistant messages.
- Tool activity summary.
- System/error banners.
- Pending user input banners.
- Proposed plan cards.

Task 8.2: Implement thread detail subscription.

- Reuse `createThreadDetailManager` if available.
- Retain active thread subscription.
- Detach/evict inactive subscriptions.
- Apply snapshots and events in order.

Task 8.3: Implement composer.

- Multiline text input.
- Send button.
- Disabled states during reconnect or missing thread.
- Duplicate-send guard.

Task 8.4: Implement send message RPC.

- Use existing orchestration command contract.
- Surface server-side validation errors.
- Clear composer only after accepted submit.

Task 8.5: Add markdown rendering.

- Support basic markdown, code blocks, links, and copy.
- Defer huge feature parity with web markdown until later.

Done when:

- User can read an existing thread and send a new message from Android.

### Phase 9: Agent Control Actions

Task 9.1: Pending approvals.

- Render approval cards.
- Approve.
- Deny.
- Include command/tool context.

Task 9.2: Pending user input.

- Render requested input.
- Submit response.
- Cancel when supported.

Task 9.3: Proposed plans.

- Render plan.
- Continue/respond from composer.
- Keep export/share optional.

Task 9.4: Stop/retry controls.

- Add stop task if server contract supports it.
- Add reconnect retry.
- Keep destructive controls confirm-gated.

Done when:

- The phone can unblock common agent flows without needing the PC.

### Phase 10: Provider and Model Controls

Task 10.1: Display provider status.

- Show unavailable provider state.
- Show auth/setup-needed state.
- Link setup instructions back to PC where appropriate.

Task 10.2: Add model picker.

- Use compact mobile sheet.
- Reuse model descriptors and ordering logic.
- Persist selection through existing client/server state.

Task 10.3: Add new-thread flow.

- Select project.
- Select provider/model if needed.
- Compose first message.

Done when:

- Mobile can start useful new work, not only continue existing threads.

### Phase 11: Diffs, Files, and Review Surface

Task 11.1: Render changed files.

- Virtualized tree/list.
- Status badges.
- File icons from existing icon logic where feasible.

Task 11.2: Render diffs.

- Mobile-friendly unified diff view.
- Collapse large files.
- Lazy load heavy diff data.

Task 11.3: Add copy/share affordances.

- Copy file path.
- Copy diff snippet.
- Share text via native share sheet if useful.

Done when:

- User can inspect what the agent changed from mobile before approving or sending follow-up instructions.

### Phase 12: Android Notifications

Task 12.1: Choose push provider path.

- Expo notifications for preview builds, or FCM directly for production.
- Do not reuse APNs-only assumptions.

Task 12.2: Register device with relay.

- Use existing mobile device registration concepts.
- Extend contracts if Android-specific fields are missing.
- Store device id securely/stably.

Task 12.3: Publish notification triggers.

- Task completed.
- Task blocked.
- Approval needed.
- User input needed.

Task 12.4: Deep link into app.

- Tap notification opens environment/thread.
- If disconnected, connect first and then navigate.

Done when:

- Android can receive high-value notifications and open directly to the relevant thread.

### Phase 13: Connections Tab Product Polish

Task 13.1: Split Connections into clearer sections.

- This environment.
- Viper Connect.
- Authorized clients.
- Remote environments.
- Advanced endpoint providers.

Task 13.2: Improve Viper Connect mobile setup.

- Show step-by-step mobile setup state.
- Show linked devices.
- Show last mobile connection.
- Provide APK/download placeholder or release link.

Task 13.3: Add revocation clarity.

- Explain unlink environment vs revoke client session vs sign out device.
- Avoid accidental loss of access.

Done when:

- A normal user can get from PC to working phone app without understanding tokens, endpoints, or pairing internals.

### Phase 14: Hardening and Performance

Task 14.1: Long-thread performance.

- Profile large message timelines.
- Add pagination/windowing if needed.
- Avoid holding full render trees for inactive threads.

Task 14.2: Reconnect stress tests.

- Server restart.
- Relay unavailable.
- Phone network switches Wi-Fi to cellular.
- App backgrounded during stream.
- Auth expires during reconnect.

Task 14.3: Error taxonomy.

- Distinguish auth failure, relay failure, endpoint failure, version drift, network offline, and server unavailable.
- Make errors actionable.

Task 14.4: Version compatibility.

- Surface client/server version drift.
- Add contract decode diagnostics in mobile logs.

Done when:

- The app behaves predictably under failure and does not silently drop user actions.

### Phase 15: Build, Release, and Docs

Task 15.1: APK build docs.

- Local prerequisites.
- Environment variables.
- Build command.
- Install command.
- Troubleshooting.

Task 15.2: CI build path.

- Add Android build job when secrets and build service are ready.
- Keep unsigned/local build available for dev.

Task 15.3: User docs.

- How to enable Viper Connect on PC.
- How to install APK.
- How to sign in.
- How to pair manually.
- How to revoke access.

Task 15.4: Release checklist.

- Auth config.
- Relay config.
- APK signing.
- Smoke tests.
- Security review.

Done when:

- A user can install the APK and connect to their Viper Code environment using documented steps.

## Suggested Task Execution Order

1. Phase 0: Confirm scope and audit.
2. Phase 1: Scaffold `apps/mobile`.
3. Phase 2: Make shared runtime mobile-safe.
4. Phase 3: Implement Clerk auth.
5. Phase 4: List and connect Viper Connect environments.
6. Phase 5: Add manual QR/paste pairing fallback.
7. Phase 6: Harden connection lifecycle.
8. Phase 7: Build environment/project/thread navigation.
9. Phase 8: Build chat read/send MVP.
10. Phase 9: Add approval and pending-input controls.
11. Phase 10: Add model/provider/new-thread controls.
12. Phase 11: Add diffs and file review.
13. Phase 12: Add Android notifications.
14. Phase 13: Polish desktop Connections Viper Connect setup.
15. Phase 14: Stress, performance, and failure hardening.
16. Phase 15: APK release docs and CI.

## MVP Definition

The first MVP is complete when:

- `apps/mobile` exists and builds an installable Android APK.
- User can sign into Viper Connect.
- User can see linked environments.
- User can connect to a linked desktop/server environment.
- User can manually pair with QR/paste if Viper Connect is unavailable.
- User can browse projects and threads.
- User can open a thread and see messages/status.
- User can send a message.
- User can respond to approvals and pending user input.
- Reconnect works after app foregrounding.
- Docs explain setup and revocation.
- `vp check`, `vp run typecheck`, and the mobile lint/test/build gates pass for touched packages.

## Risks and Mitigations

Risk: Mobile pulls in browser-only web code.

- Mitigation: Extract pure logic to shared packages and build native views separately.

Risk: Token storage is implemented insecurely.

- Mitigation: Define storage boundaries before auth work and test that secrets only use secure storage.

Risk: Reconnect is unreliable on Android background/foreground transitions.

- Mitigation: Build lifecycle handling before chat features get large.

Risk: UI parity creates too much duplicated component work.

- Mitigation: Share domain logic, state reducers, formatting helpers, and contracts. Recreate visual components natively.

Risk: Viper Connect relay flow is too coupled to web.

- Mitigation: Move relay session and query manager usage into mobile-safe runtime adapters.

Risk: First release tries to include notifications, terminal input, attachments, and full diff parity.

- Mitigation: Lock MVP to connection, browse, send, approval/input, and basic inspect.

## Open Questions

1. Should the first APK be unsigned/debug-only for internal testing, or signed release APK from the start?
2. Should Android notifications use Expo notifications first or direct FCM first?
3. Should terminal input be explicitly blocked in MVP UI, or hidden until supported?
4. Should the mobile app require Viper Connect sign-in, or allow manual-only mode from first launch?
5. Should the APK download link live in the desktop Connections tab before the first public release, or remain docs-only until signing is ready?

## Recommended First Implementation PRs

PR 1: Mobile plan and docs.

- Add this plan.
- Add `docs/mobile/app.md`.
- Fix docs index if needed.

PR 2: `apps/mobile` Expo scaffold.

- Add package config.
- Add native app shell.
- Add TypeScript and lint/test scripts.
- Prove Android dev launch.

PR 3: Mobile runtime storage and config.

- Add public config loader.
- Add secure storage adapter.
- Add managed relay runtime adapter.

PR 4: Mobile Clerk sign-in.

- Add auth provider.
- Add signed-in/out screens.
- Add relay token acquisition.

PR 5: Viper Connect environment list.

- List linked environments.
- Refresh state.
- Empty/error states.

PR 6: Managed environment connect.

- Save selected environment.
- Establish websocket.
- Receive config snapshot.
- Reconnect on foreground.

PR 7: Manual pairing.

- QR scanner.
- Paste pairing URL.
- Exchange token and connect.

PR 8: Thread browser.

- Projects.
- Thread summaries.
- Status.
- Last selected state.

PR 9: Thread detail and send.

- Message timeline.
- Composer.
- Send command.
- Duplicate-send guard.

PR 10: Agent unblock controls.

- Pending approvals.
- Pending user input.
- Proposed plan display.

After PR 10, the app should be useful enough for daily internal testing.
