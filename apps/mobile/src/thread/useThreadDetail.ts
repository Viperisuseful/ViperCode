import { useCallback, useSyncExternalStore } from "react";
import type { ThreadId } from "@vipercode/contracts";
import { EMPTY_THREAD_DETAIL, type ThreadDetailState } from "./threadTypes.ts";

interface ThreadDetailStore {
  readonly threads: Map<ThreadId, ThreadDetailState>;
  readonly listeners: Set<() => void>;
}

function createThreadDetailStore(): ThreadDetailStore {
  return { threads: new Map(), listeners: new Set() };
}

const store = createThreadDetailStore();

function notify() {
  for (const listener of store.listeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

export function getThreadDetail(threadId: ThreadId): ThreadDetailState {
  return store.threads.get(threadId) ?? { ...EMPTY_THREAD_DETAIL, threadId };
}

export function setThreadDetail(threadId: ThreadId, state: ThreadDetailState): void {
  store.threads.set(threadId, state);
  notify();
}

export function useThreadDetail(threadId: ThreadId): ThreadDetailState {
  const subscribe = useCallback((onChange: () => void) => {
    store.listeners.add(onChange);
    return () => {
      store.listeners.delete(onChange);
    };
  }, []);

  const getSnapshot = useCallback(() => getThreadDetail(threadId), [threadId]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
