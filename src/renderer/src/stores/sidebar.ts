import type { SidebarPosition, SidebarTab } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clamp } from "@/lib/clamp";

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

const DEFAULT_WIDTH = 20;
const MIN_WIDTH = 15;
const MAX_WIDTH = 40;

const INITIAL_POSITION = "left";
const INITIAL_WIDTH = 20;

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
      setSidebarTab: currentTab => set({ currentTab }),
      setSidebarOpen: isOpen => set({ isOpen }),
      toggleSidebar: () => set({ isOpen: !get().isOpen }),
      setSidebarDragging: isDragging =>
        set(state => ({
          dropZoneActive: isDragging ? state.dropZoneActive : null,
          isDragging,
        })),
      setSidebarDropZone: dropZoneActive => set({ dropZoneActive }),
      setSidebarPosition: position =>
        set({
          dropZoneActive: null,
          isDragging: false,
          isOpen: true,
          position,
        }),
      setSidebarWidth: width =>
        set(state => ({
          width:
            Math.round(clamp(width, state.minWidth, state.maxWidth) * 10) / 10,
        })),
    }),
    {
      name: "sidebar-storage",
      partialize: state => ({
        position: state.position,
        width: state.width,
      }),
    },
  ),
);
