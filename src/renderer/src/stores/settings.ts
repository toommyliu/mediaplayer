import type { WindowBlurAction } from "@/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createUserDataStateStorage,
  registerPersistedStoreRehydration,
} from "@/stores/user-data-storage";

export interface SettingsState {
  showDialog: boolean;
  windowBlurAction: WindowBlurAction;
}

export interface SettingsActions {
  setSettingsDialogOpen: (showDialog: boolean) => void;
  setWindowBlurAction: (windowBlurAction: WindowBlurAction) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

type SettingsPersisted = Pick<SettingsState, "windowBlurAction">;

const WINDOW_BLUR_ACTIONS = new Set<WindowBlurAction>(["mute", "none", "pause"]);

function migrateSettingsState(persistedState: unknown): SettingsPersisted {
  if (!persistedState || typeof persistedState !== "object") {
    return { windowBlurAction: "none" };
  }

  const { windowBlurAction } = persistedState as Partial<SettingsPersisted>;
  return {
    windowBlurAction: WINDOW_BLUR_ACTIONS.has(windowBlurAction as WindowBlurAction)
      ? (windowBlurAction as WindowBlurAction)
      : "none",
  };
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      showDialog: false,
      windowBlurAction: "none",
      setSettingsDialogOpen: (showDialog) => set({ showDialog }),
      setWindowBlurAction: (windowBlurAction) => set({ windowBlurAction }),
    }),
    {
      name: "settings-store",
      storage: createJSONStorage<SettingsPersisted>(() => createUserDataStateStorage()),
      version: 1,
      migrate: migrateSettingsState,
      partialize: (state) => ({ windowBlurAction: state.windowBlurAction }),
    },
  ),
);

registerPersistedStoreRehydration("settings-store", () => useSettingsStore.persist.rehydrate());
