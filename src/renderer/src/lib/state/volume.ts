import { create } from "zustand";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/state/persistence";
import { clamp } from "@/lib/state/utils";

type VolumeState = {
  isMuted: boolean;
  value: number;
};

const initialVolumeValue = clamp(readStorage<number>(STORAGE_KEYS.volume, 1), 0, 1);

const useVolumeStoreBase = create<VolumeState>(() => ({
  isMuted: initialVolumeValue === 0,
  value: initialVolumeValue
}));

export function useVolumeState<T>(selector: (state: VolumeState) => T): T {
  return useVolumeStoreBase(selector);
}

export function getVolumeState(): VolumeState {
  return useVolumeStoreBase.getState();
}

export function setMuted(isMuted: boolean): void {
  useVolumeStoreBase.setState((state) => ({
    ...state,
    isMuted
  }));
}

export function setVolume(value: number): void {
  const next = clamp(value, 0, 1);
  writeStorage(STORAGE_KEYS.volume, next);
  useVolumeStoreBase.setState((state) => ({
    isMuted: next === 0 ? true : state.isMuted,
    value: next
  }));
}

export function increaseVolume(step = 0.1): void {
  const next = Math.min(1, getVolumeState().value + step);
  setVolume(next);
  if (next > 0) {
    setMuted(false);
  }
}

export function decreaseVolume(step = 0.1): void {
  const next = Math.max(0, getVolumeState().value - step);
  setVolume(next);
  setMuted(next === 0);
}
