import { create } from "zustand";
import type { AppState } from "@/types";

type PlayerState = AppState["player"];

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

const usePlayerStoreBase = create<PlayerState>(() => initialPlayerState);

export function usePlayerState<T>(selector: (state: PlayerState) => T): T {
  return usePlayerStoreBase(selector);
}

export function getPlayerState(): PlayerState {
  return usePlayerStoreBase.getState();
}

export function setPlayerState(patch: Partial<PlayerState>): void {
  usePlayerStoreBase.setState((state) => ({
    ...state,
    ...patch
  }));
}

export function resetPlayer(): void {
  usePlayerStoreBase.setState((state) => ({
    ...state,
    currentTime: 0,
    duration: 0,
    isPlaying: false
  }));
}

export function setCurrentTime(currentTime: number): void {
  usePlayerStoreBase.setState((state) => ({
    ...state,
    currentTime
  }));
}

export function setDuration(duration: number): void {
  usePlayerStoreBase.setState((state) => ({
    ...state,
    duration
  }));
}
