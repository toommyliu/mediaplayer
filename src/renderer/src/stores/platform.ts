import { create } from "zustand";
import type { PlatformState } from "@/types";

export interface PlatformActions {
  setPlatformState: (next: PlatformState) => void;
}

export type PlatformStore = PlatformState & PlatformActions;

const initialPlatformState: PlatformState = {
  isLinux: false,
  isMac: false,
  isWindows: false,
  pathSep: "/"
};

export const usePlatformStore = create<PlatformStore>()((set) => ({
  ...initialPlatformState,
  setPlatformState: (next) => set(next)
}));
