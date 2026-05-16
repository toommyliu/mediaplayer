import type { AspectRatioMode } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  isQuickJumpOpen: boolean;
  playbackRate: number;
  seekUndoStack: Array<{ time: number; video: string | null }>;
  showControls: boolean;
}

export interface PlayerActions {
  setPlayerState: (patch: Partial<PlayerState>) => void;
  resetPlayer: () => void;
  setPlaybackRate: (playbackRate: number) => void;
  increasePlaybackRate: () => void;
  decreasePlaybackRate: () => void;
  setCurrentTime: (currentTime: number) => void;
  setDuration: (duration: number) => void;
  pushSeekUndoTime: (time: number, video?: string | null) => void;
  popSeekUndoTime: (currentVideo: string | null) => number | null;
  clearSeekUndoStack: () => void;
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
  isQuickJumpOpen: false,
  playbackRate: 1,
  seekUndoStack: [],
  showControls: true,
};

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

const SEEK_UNDO_STACK_LIMIT = 50;

function getPlaybackRateIndex(playbackRate: number): number {
  const exactIndex = PLAYBACK_RATES.indexOf(
    playbackRate as (typeof PLAYBACK_RATES)[number],
  );

  if (exactIndex !== -1)
    return exactIndex;

  return PLAYBACK_RATES.reduce((closestIndex, rate, index) => {
    const closestRate = PLAYBACK_RATES[closestIndex];
    return Math.abs(rate - playbackRate) < Math.abs(closestRate - playbackRate)
      ? index
      : closestIndex;
  }, 0);
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      ...initialPlayerState,
      setPlayerState: patch => set(state => ({ ...state, ...patch })),
      resetPlayer: () =>
        set(state => ({
          ...state,
          currentTime: 0,
          duration: 0,
          error: null,
          isLoading: false,
          isPlaying: false,
          seekUndoStack: [],
        })),
      setCurrentTime: currentTime => set({ currentTime }),
      setDuration: duration => set({ duration }),
      setPlaybackRate: playbackRate => set({ playbackRate }),
      increasePlaybackRate: () => {
        const currentIndex = getPlaybackRateIndex(get().playbackRate);
        const nextIndex = Math.min(PLAYBACK_RATES.length - 1, currentIndex + 1);
        set({ playbackRate: PLAYBACK_RATES[nextIndex] });
      },
      decreasePlaybackRate: () => {
        const currentIndex = getPlaybackRateIndex(get().playbackRate);
        const nextIndex = Math.max(0, currentIndex - 1);
        set({ playbackRate: PLAYBACK_RATES[nextIndex] });
      },
      pushSeekUndoTime: (time, video = get().currentVideo) => {
        if (!Number.isFinite(time) || time < 0)
          return;

        set(state => ({
          seekUndoStack: [
            ...state.seekUndoStack,
            { time, video },
          ].slice(-SEEK_UNDO_STACK_LIMIT),
        }));
      },
      popSeekUndoTime: (currentVideo) => {
        let undoTime: number | null = null;

        set((state) => {
          const nextStack = [...state.seekUndoStack];

          while (nextStack.length > 0) {
            const entry = nextStack.pop();
            if (entry?.video === currentVideo) {
              undoTime = entry.time;
              break;
            }
          }

          return { seekUndoStack: nextStack };
        });

        return undoTime;
      },
      clearSeekUndoStack: () => set({ seekUndoStack: [] }),
    }),
    {
      name: "player-store",
      partialize: state => ({ playbackRate: state.playbackRate }),
    },
  ),
);
