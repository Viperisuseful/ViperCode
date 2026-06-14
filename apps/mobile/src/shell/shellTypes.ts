import type {
  EnvironmentId,
  OrchestrationProjectShell,
  OrchestrationThreadShell,
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

export interface ShellState {
  readonly projects: ReadonlyArray<ScopedProject>;
  readonly threads: ReadonlyArray<ScopedThread>;
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
    isPending: false,
    error: null,
  };
}

export const EMPTY_SHELL_STATE: ShellState = {
  projects: [],
  threads: [],
  isPending: true,
  error: null,
};
