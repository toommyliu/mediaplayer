import { create } from "zustand";

export interface SettingsState {
  showDialog: boolean;
}

export interface SettingsActions {
  setSettingsDialogOpen: (showDialog: boolean) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()((set) => ({
  showDialog: false,
  setSettingsDialogOpen: (showDialog) => set({ showDialog }),
}));
