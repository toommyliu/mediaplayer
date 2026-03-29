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
