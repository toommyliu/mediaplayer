import type { AspectRatioMode } from "@/types";
import { create } from "zustand";

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
  seekUndoStack: Array<{ time: number; video: string | null }>;
  showControls: boolean;
}

export interface PlayerActions {
  setPlayerState: (patch: Partial<PlayerState>) => void;
  resetPlayer: () => void;
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
  seekUndoStack: [],
  showControls: true,
};

const SEEK_UNDO_STACK_LIMIT = 50;

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  ...initialPlayerState,
  setPlayerState: patch => set(state => ({ ...state, ...patch })),
  resetPlayer: () =>
    set(state => ({
      ...state,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      seekUndoStack: [],
    })),
  setCurrentTime: currentTime => set({ currentTime }),
  setDuration: duration => set({ duration }),
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
}));
