import { create } from "zustand";
import type { AspectRatioMode } from "@/types";

export interface PlayerState {
  aspectRatio: AspectRatioMode;
  currentTime: number;
  currentVideo: string | null;
  duration: number;
  error: string | null;
  isFullscreen: boolean;
  isHolding: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  showControls: boolean;
}

export interface PlayerActions {
  setPlayerState: (patch: Partial<PlayerState>) => void;
  resetPlayer: () => void;
  setCurrentTime: (currentTime: number) => void;
  setDuration: (duration: number) => void;
}

export type PlayerStore = PlayerState & PlayerActions;

const initialPlayerState: PlayerState = {
  aspectRatio: "contain",
  currentTime: 0,
  currentVideo: null,
  duration: 0,
  error: null,
  isFullscreen: false,
  isHolding: false,
  isLoading: false,
  isPlaying: false,
  showControls: true
};

export const usePlayerStore = create<PlayerStore>()((set) => ({
  ...initialPlayerState,
  setPlayerState: (patch) => set((state) => ({ ...state, ...patch })),
  resetPlayer: () =>
    set((state) => ({
      ...state,
      currentTime: 0,
      duration: 0,
      isPlaying: false
    })),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration })
}));
