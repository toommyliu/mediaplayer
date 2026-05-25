import type { StateStorage } from "zustand/middleware";
import {
  readPersistedStore,
  removePersistedStore,
  writePersistedStore,
} from "@/lib/ipc";

export function createUserDataStateStorage(): StateStorage<Promise<void>> {
  return {
    getItem: async (name) => {
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
