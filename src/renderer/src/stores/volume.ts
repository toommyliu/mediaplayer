import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clamp } from "@/lib/clamp";
import { VOLUME_STEP } from "@/lib/constants";
import {
  createUserDataStateStorage,
  registerPersistedStoreRehydration,
} from "@/stores/user-data-storage";

export interface VolumeState {
  boost: number;
  isMuted: boolean;
  value: number;
}

export interface VolumeActions {
  setBoost: (boost: number) => void;
  setMuted: (isMuted: boolean) => void;
  setVolume: (value: number) => void;
  increaseVolume: (step?: number) => void;
  decreaseVolume: (step?: number) => void;
}

export type VolumeStore = VolumeState & VolumeActions;

type VolumePersisted = VolumeState;

function migrateVolumeState(persistedState: unknown): VolumePersisted {
  if (!persistedState || typeof persistedState !== "object") {
    return {
      boost: 1,
      isMuted: false,
      value: 1,
    };
  }

  const state = persistedState as Partial<VolumePersisted>;
  return {
    boost:
      typeof state.boost === "number" && Number.isFinite(state.boost)
        ? clamp(state.boost, 1, 3)
        : 1,
    isMuted: typeof state.isMuted === "boolean" ? state.isMuted : false,
    value:
      typeof state.value === "number" && Number.isFinite(state.value)
        ? clamp(state.value, 0, 1)
        : 1,
  };
}

export const useVolumeStore = create<VolumeStore>()(
  persist(
    (set, get) => ({
      boost: 1,
      isMuted: false,
      value: 1.0,
      setBoost: (boost) => set({ boost: clamp(boost, 1, 3) }),
      setMuted: (isMuted) => set({ isMuted }),
      setVolume: (value) => {
        const next = clamp(value, 0, 1);
        set((state) => ({
          isMuted: next === 0 ? true : state.isMuted,
          value: next,
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
      },
    }),
    {
      name: "volume-store",
      storage: createJSONStorage<VolumePersisted>(() => createUserDataStateStorage()),
      version: 1,
      migrate: migrateVolumeState,
      partialize: (state) => ({
        boost: state.boost,
        isMuted: state.isMuted,
        value: state.value,
      }),
    },
  ),
);

registerPersistedStoreRehydration("volume-store", () => useVolumeStore.persist.rehydrate());
