import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HotkeyCategory } from "@/types";

export interface HotkeysState {
  bindings: Record<string, string[]>;
  categories: HotkeyCategory[];
  enabled: boolean;
  initialized: boolean;
  modKey: string;
}

export interface HotkeysActions {
  setHotkeyCategories: (categories: HotkeyCategory[], modKey: string, initialized: boolean) => void;
  updateHotkeyInState: (actionId: string, newKeys: string[]) => boolean;
  clearStoredHotkeys: () => void;
  getStoredHotkeys: () => Record<string, string[]> | null;
  setStoredHotkeys: (bindings: Record<string, string[]>) => void;
}

export type HotkeysStore = HotkeysState & HotkeysActions;

type HotkeysPersisted = Pick<HotkeysState, "bindings">;

export const useHotkeysStore = create<HotkeysStore>()(
  persist(
    (set, get) => ({
      bindings: {},
      categories: [],
      enabled: true,
      initialized: false,
      modKey: "",
      setHotkeyCategories: (categories, modKey, initialized) =>
        set({ categories, initialized, modKey }),
      updateHotkeyInState: (actionId, newKeys) => {
        const state = get();
        const category = state.categories.find((cat) => cat.actions.some((a) => a.id === actionId));
        if (!category) return false;

        const action = category.actions.find((a) => a.id === actionId);
        if (!action || action.configurable === false) return false;

        const updatedCategories = state.categories.map((cat) => ({
          ...cat,
          actions: cat.actions.map((a) => (a.id === actionId ? { ...a, keys: newKeys } : a))
        }));

        set({ categories: updatedCategories });

        const bindings: Record<string, string[]> = {};
        for (const cat of updatedCategories) {
          for (const a of cat.actions) {
            bindings[a.id] = a.keys;
          }
        }
        get().setStoredHotkeys(bindings);
        return true;
      },
      clearStoredHotkeys: () => set({ bindings: {} }),
      getStoredHotkeys: () => {
        const bindings = get().bindings;
        return Object.keys(bindings).length > 0 ? bindings : null;
      },
      setStoredHotkeys: (bindings) => set({ bindings })
    }),
    {
      name: "hotkeys-store",
      partialize: (state): HotkeysPersisted => {
        return { bindings: state.bindings };
      }
    }
  )
);

export function getStoredHotkeys(): Record<string, string[]> | null {
  return useHotkeysStore.getState().getStoredHotkeys();
}
