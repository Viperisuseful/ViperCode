import type { ThreadId } from "@vipercode/contracts";

export interface ThreadMessage {
  readonly id: string;
  readonly role: "user" | "assistant" | "system";
  readonly text: string;
  readonly streaming: boolean;
  readonly turnId: string | null;
  readonly createdAt: string;
}

export interface ThreadPlan {
  readonly id: string;
  readonly planMarkdown: string;
  readonly implementedAt: string | null;
}

export interface ThreadActivity {
  readonly id: string;
  readonly summary: string;
  readonly turnId: string | null;
  readonly createdAt: string;
}

export interface ThreadSummary {
  readonly threadId: ThreadId;
  readonly title: string;
  readonly status: string;
  readonly hasPendingApprovals: boolean;
  readonly hasPendingUserInput: boolean;
}

export interface ThreadDetailState {
  readonly threadId: ThreadId;
  readonly messages: ReadonlyArray<ThreadMessage>;
  readonly plans: ReadonlyArray<ThreadPlan>;
  readonly activities: ReadonlyArray<ThreadActivity>;
  readonly status: string;
  readonly hasPendingApprovals: boolean;
  readonly hasPendingUserInput: boolean;
  readonly isPending: boolean;
  readonly error: string | null;
}

export const EMPTY_THREAD_DETAIL: ThreadDetailState = {
  threadId: "" as ThreadId,
  messages: [],
  plans: [],
  activities: [],
  status: "idle",
  hasPendingApprovals: false,
  hasPendingUserInput: false,
  isPending: true,
  error: null,
};
