import { create } from "zustand";
import { persist } from "zustand/middleware";
import { VOLUME_STEP } from "@/lib/constants";
import { clamp } from "@/stores/utils";

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

export const useVolumeStore = create<VolumeStore>()(
  persist(
    (set, get) => ({
      isMuted: false,
      value: 1.0,
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
