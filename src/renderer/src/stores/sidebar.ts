import type { SidebarPosition, SidebarTab } from "@/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clamp } from "@/lib/clamp";
import { createUserDataStateStorage } from "@/stores/user-data-storage";

export interface SidebarState {
  currentTab: SidebarTab;
  defaultWidth: number;
  dropZoneActive: SidebarPosition | null;
  isDragging: boolean;
  isOpen: boolean;
  maxWidth: number;
  minWidth: number;
  position: SidebarPosition;
  width: number;
}

export interface SidebarActions {
  setSidebarTab: (currentTab: SidebarTab) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  setSidebarDragging: (isDragging: boolean) => void;
  setSidebarDropZone: (dropZoneActive: SidebarPosition | null) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  setSidebarWidth: (width: number) => void;
}

export type SidebarStore = SidebarState & SidebarActions;

type SidebarPersisted = Pick<SidebarState, "position" | "width">;

const DEFAULT_WIDTH = 20;
const MIN_WIDTH = 15;
const MAX_WIDTH = 40;

const INITIAL_POSITION = "left";
const INITIAL_WIDTH = 20;

const SIDEBAR_POSITIONS = new Set<SidebarPosition>(["left", "right"]);

function migrateSidebarState(persistedState: unknown): SidebarPersisted {
  if (!persistedState || typeof persistedState !== "object") {
    return {
      position: INITIAL_POSITION,
      width: INITIAL_WIDTH,
    };
  }

  const state = persistedState as Partial<SidebarPersisted>;
  return {
    position: SIDEBAR_POSITIONS.has(state.position as SidebarPosition)
      ? (state.position as SidebarPosition)
      : INITIAL_POSITION,
    width:
      typeof state.width === "number" && Number.isFinite(state.width)
        ? Math.round(clamp(state.width, MIN_WIDTH, MAX_WIDTH) * 10) / 10
        : INITIAL_WIDTH,
  };
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      currentTab: "file-browser",
      defaultWidth: DEFAULT_WIDTH,
      dropZoneActive: null,
      isDragging: false,
      isOpen: true,
      maxWidth: MAX_WIDTH,
      minWidth: MIN_WIDTH,
      position: INITIAL_POSITION,
      width: INITIAL_WIDTH,
      setSidebarTab: (currentTab) => set({ currentTab }),
      setSidebarOpen: (isOpen) => set({ isOpen }),
      toggleSidebar: () => set({ isOpen: !get().isOpen }),
      setSidebarDragging: (isDragging) =>
        set((state) => ({
          dropZoneActive: isDragging ? state.dropZoneActive : null,
          isDragging,
        })),
      setSidebarDropZone: (dropZoneActive) => set({ dropZoneActive }),
      setSidebarPosition: (position) =>
        set({
          dropZoneActive: null,
          isDragging: false,
          isOpen: true,
          position,
        }),
      setSidebarWidth: (width) =>
        set((state) => ({
          width: Math.round(clamp(width, state.minWidth, state.maxWidth) * 10) / 10,
        })),
    }),
    {
      name: "sidebar-storage",
      storage: createJSONStorage<SidebarPersisted>(() => createUserDataStateStorage()),
      version: 1,
      migrate: migrateSidebarState,
      partialize: (state) => ({
        position: state.position,
        width: state.width,
      }),
    },
  ),
);
