import type { StateStorage } from "zustand/middleware";
import {
  onPersistedStoreChanged,
  readPersistedStore,
  removePersistedStore,
  writePersistedStore,
} from "@/lib/ipc";

type RehydratePersistedStore = () => Promise<void> | void;

const externalStoreValues = new Map<string, string | null>();
const rehydrators = new Map<string, Set<RehydratePersistedStore>>();
let persistedStoreListenerStarted = false;

function ensurePersistedStoreListener(): void {
  if (persistedStoreListenerStarted) return;
  persistedStoreListenerStarted = true;

  onPersistedStoreChanged(({ name, value }) => {
    externalStoreValues.set(name, value);

    const storeRehydrators = rehydrators.get(name);
    if (!storeRehydrators) return;

    for (const rehydrate of storeRehydrators) {
      void rehydrate();
    }
  });
}

export function registerPersistedStoreRehydration(
  name: string,
  rehydrate: RehydratePersistedStore,
): void {
  ensurePersistedStoreListener();

  const existing = rehydrators.get(name);
  if (existing) {
    existing.add(rehydrate);
    return;
  }

  rehydrators.set(name, new Set([rehydrate]));
}

export function createUserDataStateStorage(): StateStorage<Promise<void>> {
  return {
    getItem: async (name) => {
      if (externalStoreValues.has(name)) {
        const externalValue = externalStoreValues.get(name) ?? null;
        externalStoreValues.delete(name);
        return externalValue;
      }

      const persistedValue = await readPersistedStore(name);
      if (persistedValue !== null) {
        return persistedValue;
      }

      const localStorageValue = window.localStorage.getItem(name);
      if (localStorageValue === null) {
        return null;
      }

      await writePersistedStore(name, localStorageValue);
      window.localStorage.removeItem(name);
      return localStorageValue;
    },
    removeItem: async (name) => {
      await removePersistedStore(name);
      window.localStorage.removeItem(name);
    },
    setItem: async (name, value) => {
      await writePersistedStore(name, value);
      window.localStorage.removeItem(name);
    },
  };
}
