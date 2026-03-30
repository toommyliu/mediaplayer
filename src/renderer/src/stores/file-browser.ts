import type { DirectoryContents } from "@/lib/contracts";
import type { AppState, FileSystemItem } from "@/types";
import { create } from "zustand";
import { sortFileTree } from "../../../shared";

export type FileBrowserState = AppState["fileBrowser"];

export interface FileBrowserActions {
  setFileBrowserState: (patch: Partial<FileBrowserState>) => void;
  resetFileBrowser: () => void;
  setFileBrowserScrollTop: (scrollTop: number) => void;
  setFileBrowserSort: (sortBy: "duration" | "name") => void;
  setExpandedFolders: (expandedFolders: Set<string>) => void;
}

export type FileBrowserStore = FileBrowserState & FileBrowserActions;

const initialFileBrowserState: FileBrowserState = {
  currentPath: null,
  error: null,
  expandedFolders: new Set<string>(),
  fileTree: null,
  focusedItemPath: null,
  isAtRoot: false,
  isLoading: false,
  loadingFolders: new Set<string>(),
  openContextMenu: null,
  originalPath: null,
  scrollTop: 0,
  sortBy: "name",
  sortDirection: "asc",
};

export const useFileBrowserStore = create<FileBrowserStore>()((set) => ({
  ...initialFileBrowserState,
  setFileBrowserState: (patch) => set((state) => ({ ...state, ...patch })),
  resetFileBrowser: () =>
    set((state) => ({
      ...state,
      currentPath: null,
      expandedFolders: new Set<string>(),
      fileTree: null,
      isAtRoot: false,
      isLoading: false,
      loadingFolders: new Set<string>(),
      originalPath: null,
    })),
  setFileBrowserScrollTop: (scrollTop) => set({ scrollTop }),
  setFileBrowserSort: (sortBy) =>
    set((state) => ({
      sortBy,
      sortDirection:
        state.sortBy === sortBy
          ? state.sortDirection === "asc"
            ? "desc"
            : "asc"
          : "asc",
    })),
  setExpandedFolders: (expandedFolders) => set({ expandedFolders }),
}));

export function findFolderInFileSystem(
  items: FileSystemItem[],
  targetPath: string,
): FileSystemItem | null {
  for (const item of items) {
    if (item.path === targetPath && item.files !== undefined) {
      return item;
    }

    if (item.files) {
      const found = findFolderInFileSystem(item.files, targetPath);
      if (found) return found;
    }
  }

  return null;
}

export function transformDirectoryContents(
  directoryContents: DirectoryContents,
  sortBy: FileBrowserState["sortBy"],
  sortDirection: FileBrowserState["sortDirection"],
): FileSystemItem[] {
  if (!directoryContents?.files) return [];

  return sortFileTree(
    directoryContents.files.map((item) => ({
      duration: item.duration ?? 0,
      files: item.type === "folder" ? [] : undefined,
      name: item.name,
      path: item.path,
      type: item.type,
    })),
    {
      sortBy,
      sortDirection,
    },
  );
}

export function updateFolderContents(
  items: FileSystemItem[],
  targetPath: string,
  newContents: FileSystemItem[],
): FileSystemItem[] | null {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.path === targetPath && item.files !== undefined) {
      const nextItems = [...items];
      nextItems[index] = { ...item, files: newContents };
      return nextItems;
    }

    if (item.files) {
      const updated = updateFolderContents(item.files, targetPath, newContents);
      if (updated) {
        const nextItems = [...items];
        nextItems[index] = { ...item, files: updated };
        return nextItems;
      }
    }
  }

  return null;
}
