import { create } from "zustand";
import { sortFileTree } from "../../../../shared";
import type { AppState, FileSystemItem } from "@/types";
import type { DirectoryContents } from "@/lib/contracts";

type FileBrowserState = AppState["fileBrowser"];

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
  sortDirection: "asc"
};

const useFileBrowserStoreBase = create<FileBrowserState>(() => initialFileBrowserState);

export function useFileBrowserState<T>(selector: (state: FileBrowserState) => T): T {
  return useFileBrowserStoreBase(selector);
}

export function getFileBrowserState(): FileBrowserState {
  return useFileBrowserStoreBase.getState();
}

export function setFileBrowserState(patch: Partial<FileBrowserState>): void {
  useFileBrowserStoreBase.setState((state) => ({
    ...state,
    ...patch
  }));
}

export function resetFileBrowser(): void {
  useFileBrowserStoreBase.setState((state) => ({
    ...state,
    currentPath: null,
    expandedFolders: new Set<string>(),
    fileTree: null,
    isAtRoot: false,
    isLoading: false,
    loadingFolders: new Set<string>(),
    originalPath: null
  }));
}

export function setFileBrowserScrollTop(scrollTop: number): void {
  useFileBrowserStoreBase.setState((state) => ({
    ...state,
    scrollTop
  }));
}

export function setFileBrowserSort(sortBy: "duration" | "name"): void {
  useFileBrowserStoreBase.setState((state) => ({
    ...state,
    sortBy,
    sortDirection:
      state.sortBy === sortBy ? (state.sortDirection === "asc" ? "desc" : "asc") : "asc"
  }));
}

export function setExpandedFolders(expandedFolders: Set<string>): void {
  useFileBrowserStoreBase.setState((state) => ({
    ...state,
    expandedFolders
  }));
}

export function findFolderInFileSystem(
  items: FileSystemItem[],
  targetPath: string
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
  sortDirection: FileBrowserState["sortDirection"]
): FileSystemItem[] {
  if (!directoryContents?.files) return [];

  return sortFileTree(
    directoryContents.files.map((item) => ({
      duration: item.duration ?? 0,
      files: item.type === "folder" ? [] : undefined,
      name: item.name,
      path: item.path,
      type: item.type
    })),
    {
      sortBy,
      sortDirection
    }
  );
}

export function updateFolderContents(
  items: FileSystemItem[],
  targetPath: string,
  newContents: FileSystemItem[]
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

export type { FileBrowserState };
