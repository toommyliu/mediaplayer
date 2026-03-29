import { create } from "zustand";
import type { SidebarPosition, SidebarTab } from "@/types";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/state/persistence";
import { clamp } from "@/lib/state/utils";

type SidebarState = {
  currentTab: SidebarTab;
  defaultWidth: number;
  dropZoneActive: SidebarPosition | null;
  isDragging: boolean;
  isOpen: boolean;
  maxWidth: number;
  minWidth: number;
  position: SidebarPosition;
  width: number;
};

const defaultWidth = 20;
const minWidth = 15;
const maxWidth = 40;

const useSidebarStoreBase = create<SidebarState>(() => ({
  currentTab: "file-browser",
  defaultWidth,
  dropZoneActive: null,
  isDragging: false,
  isOpen: true,
  maxWidth,
  minWidth,
  position: readStorage<SidebarPosition>(STORAGE_KEYS.sidebarPosition, "left"),
  width: clamp(readStorage<number>(STORAGE_KEYS.sidebarWidth, defaultWidth), minWidth, maxWidth)
}));

export function useSidebarState<T>(selector: (state: SidebarState) => T): T {
  return useSidebarStoreBase(selector);
}

export function getSidebarState(): SidebarState {
  return useSidebarStoreBase.getState();
}

export function setSidebarTab(currentTab: SidebarTab): void {
  useSidebarStoreBase.setState((state) => ({
    ...state,
    currentTab
  }));
}

export function setSidebarOpen(isOpen: boolean): void {
  useSidebarStoreBase.setState((state) => ({
    ...state,
    isOpen
  }));
}

export function toggleSidebar(): void {
  setSidebarOpen(!getSidebarState().isOpen);
}

export function setSidebarDragging(isDragging: boolean): void {
  useSidebarStoreBase.setState((state) => ({
    ...state,
    dropZoneActive: isDragging ? state.dropZoneActive : null,
    isDragging
  }));
}

export function setSidebarDropZone(dropZoneActive: SidebarPosition | null): void {
  useSidebarStoreBase.setState((state) => ({
    ...state,
    dropZoneActive
  }));
}

export function setSidebarPosition(position: SidebarPosition): void {
  writeStorage(STORAGE_KEYS.sidebarPosition, position);
  useSidebarStoreBase.setState((state) => ({
    ...state,
    dropZoneActive: null,
    isDragging: false,
    isOpen: true,
    position
  }));
}

export function setSidebarWidth(width: number): void {
  const state = getSidebarState();
  const clamped = Math.round(clamp(width, state.minWidth, state.maxWidth) * 10) / 10;
  writeStorage(STORAGE_KEYS.sidebarWidth, clamped);
  useSidebarStoreBase.setState((current) => ({
    ...current,
    width: clamped
  }));
}
