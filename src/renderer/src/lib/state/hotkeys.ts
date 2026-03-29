import { create } from "zustand";
import type { HotkeyCategory } from "@/types";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/state/persistence";

type HotkeysState = {
  categories: HotkeyCategory[];
  enabled: boolean;
  initialized: boolean;
  modKey: string;
};

const useHotkeysStoreBase = create<HotkeysState>(() => ({
  categories: [],
  enabled: true,
  initialized: false,
  modKey: ""
}));

export function useHotkeysState<T>(selector: (state: HotkeysState) => T): T {
  return useHotkeysStoreBase(selector);
}

export function getHotkeysState(): HotkeysState {
  return useHotkeysStoreBase.getState();
}

export function setHotkeyCategories(
  categories: HotkeyCategory[],
  modKey: string,
  initialized: boolean
): void {
  useHotkeysStoreBase.setState((state) => ({
    ...state,
    categories,
    initialized,
    modKey
  }));
}

export function clearStoredHotkeys(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.hotkeys);
}

export function getStoredHotkeys(): Record<string, string[]> | null {
  return readStorage<Record<string, string[]> | null>(STORAGE_KEYS.hotkeys, null);
}

export function setStoredHotkeys(hotkeys: Record<string, string[]>): void {
  writeStorage(STORAGE_KEYS.hotkeys, hotkeys);
}

export function updateHotkeyInState(actionId: string, newKeys: string[]): boolean {
  const state = useHotkeysStoreBase.getState();
  const category = state.categories.find((cat) => cat.actions.some((a) => a.id === actionId));
  if (!category) return false;

  const action = category.actions.find((a) => a.id === actionId);
  if (!action || action.configurable === false) return false;

  const updatedCategories = state.categories.map((cat) => ({
    ...cat,
    actions: cat.actions.map((a) => (a.id === actionId ? { ...a, keys: newKeys } : a))
  }));

  useHotkeysStoreBase.setState({ categories: updatedCategories });

  const hotkeys: Record<string, string[]> = {};
  for (const cat of updatedCategories) {
    for (const a of cat.actions) {
      hotkeys[a.id] = a.keys;
    }
  }
  setStoredHotkeys(hotkeys);

  return true;
}
