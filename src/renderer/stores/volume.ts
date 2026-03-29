import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clamp } from "@/lib/state/utils";
import { VOLUME_STEP } from "@/lib/constants";

export interface VolumeState {
  isMuted: boolean;
  value: number;
}

export interface VolumeActions {
  setMuted: (isMuted: boolean) => void;
  setVolume: (value: number) => void;
  increaseVolume: (step?: number) => void;
  decreaseVolume: (step?: number) => void;
}

export type VolumeStore = VolumeState & VolumeActions;

const INITIAL_VOLUME = 1 as number;

export const useVolumeStore = create<VolumeStore>()(
  persist(
    (set, get) => ({
      isMuted: INITIAL_VOLUME === 0,
      value: INITIAL_VOLUME,
      setMuted: (isMuted) => set({ isMuted }),
      setVolume: (value) => {
        const next = clamp(value, 0, 1);
        set((state) => ({
          isMuted: next === 0 ? true : state.isMuted,
          value: next
        }));
      },
      increaseVolume: (step = VOLUME_STEP) => {
        const next = Math.min(1, get().value + step);
        get().setVolume(next);
        if (next > 0) {
          get().setMuted(false);
        }
      },
      decreaseVolume: (step = VOLUME_STEP) => {
        const next = Math.max(0, get().value - step);
        get().setVolume(next);
        get().setMuted(next === 0);
      }
    }),
    {
      name: "volume-store",
      partialize: (state) => ({
        isMuted: state.isMuted,
        value: state.value
      })
    }
  )
);
