import { create } from "zustand";

type SettingsState = {
  showDialog: boolean;
};

const useSettingsStoreBase = create<SettingsState>(() => ({
  showDialog: false
}));

export function useSettingsState<T>(selector: (state: SettingsState) => T): T {
  return useSettingsStoreBase(selector);
}

export function getSettingsState(): SettingsState {
  return useSettingsStoreBase.getState();
}

export function setSettingsDialogOpen(showDialog: boolean): void {
  useSettingsStoreBase.setState({ showDialog });
}
