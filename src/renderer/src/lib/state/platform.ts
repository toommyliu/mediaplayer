import { create } from "zustand";
import type { PlatformState } from "@/types";

const initialPlatformState: PlatformState = {
  isLinux: false,
  isMac: false,
  isWindows: false,
  pathSep: "/"
};

const usePlatformStoreBase = create<PlatformState>(() => initialPlatformState);

export function usePlatformState<T>(selector: (state: PlatformState) => T): T {
  return usePlatformStoreBase(selector);
}

export function getPlatformState(): PlatformState {
  return usePlatformStoreBase.getState();
}

export function setPlatformState(next: PlatformState): void {
  usePlatformStoreBase.setState(next);
}
