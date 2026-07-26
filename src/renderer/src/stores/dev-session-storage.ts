const DEV_SESSION_STORAGE_PREFIX = "mediaplayer:dev-session:";

interface DevSessionStore<TState> {
  getState: () => TState;
  subscribe: (listener: (state: TState, previousState: TState) => void) => () => void;
}

function getDevSessionStorage(): Storage | null {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getDevSessionStorageKey(name: string): string {
  return `${DEV_SESSION_STORAGE_PREFIX}${name}`;
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readDevSessionState<TSnapshot>(
  name: string,
  revive: (value: unknown) => TSnapshot | null,
): TSnapshot | null {
  const storage = getDevSessionStorage();
  if (!storage) return null;

  const key = getDevSessionStorageKey(name);
  try {
    const rawValue = storage.getItem(key);
    if (rawValue === null) return null;

    return revive(JSON.parse(rawValue));
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function registerDevSessionState<TState, TSnapshot>(
  name: string,
  store: DevSessionStore<TState>,
  snapshot: (state: TState) => TSnapshot,
): void {
  const storage = getDevSessionStorage();
  if (!storage) return;

  const key = getDevSessionStorageKey(name);
  const saveSnapshot = () => {
    try {
      storage.setItem(key, JSON.stringify(snapshot(store.getState())));
    } catch {
      storage.removeItem(key);
    }
  };

  saveSnapshot();
  const unsubscribe = store.subscribe(() => {
    saveSnapshot();
  });
  window.addEventListener("beforeunload", saveSnapshot);

  import.meta.hot?.dispose(() => {
    saveSnapshot();
    unsubscribe();
    window.removeEventListener("beforeunload", saveSnapshot);
  });
}
