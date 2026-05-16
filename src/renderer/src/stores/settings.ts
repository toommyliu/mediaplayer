import type { WindowBlurAction } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SettingsState {
  showDialog: boolean;
  windowBlurAction: WindowBlurAction;
}

export interface SettingsActions {
  setSettingsDialogOpen: (showDialog: boolean) => void;
  setWindowBlurAction: (windowBlurAction: WindowBlurAction) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      showDialog: false,
      windowBlurAction: "none",
      setSettingsDialogOpen: showDialog => set({ showDialog }),
      setWindowBlurAction: windowBlurAction => set({ windowBlurAction }),
    }),
    {
      name: "settings-store",
      partialize: state => ({ windowBlurAction: state.windowBlurAction }),
    },
  ),
);
