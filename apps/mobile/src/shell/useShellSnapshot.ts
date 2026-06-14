import { useCallback, useSyncExternalStore } from "react";
import type { EnvironmentId } from "@vipercode/contracts";
import { EMPTY_SHELL_STATE, type ShellState } from "./shellTypes.ts";

interface ShellSnapshotStore {
  readonly shells: Map<EnvironmentId, ShellState>;
  readonly listeners: Set<() => void>;
}

function createShellSnapshotStore(): ShellSnapshotStore {
  return {
    shells: new Map(),
    listeners: new Set(),
  };
}

const store = createShellSnapshotStore();

function notify() {
  for (const listener of store.listeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

export function getShellState(environmentId: EnvironmentId): ShellState {
  return store.shells.get(environmentId) ?? EMPTY_SHELL_STATE;
}

export function setShellState(environmentId: EnvironmentId, state: ShellState): void {
  store.shells.set(environmentId, state);
  notify();
}

export function useShellSnapshot(environmentId: EnvironmentId): ShellState {
  const subscribe = useCallback((onChange: () => void) => {
    store.listeners.add(onChange);
    return () => {
      store.listeners.delete(onChange);
    };
  }, []);

  const getSnapshot = useCallback(() => getShellState(environmentId), [environmentId]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
