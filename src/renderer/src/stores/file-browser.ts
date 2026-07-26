import type { DirectoryContents } from "@/lib/contracts";
import type { AppState, FileSystemItem } from "@/types";
import { create } from "zustand";
import {
  isObjectRecord,
  readDevSessionState,
  registerDevSessionState,
} from "@/stores/dev-session-storage";
import { sortFileTree } from "../../../shared";

export type FileBrowserState = AppState["fileBrowser"];

export interface FileBrowserActions {
  setFileBrowserState: (patch: Partial<FileBrowserState>) => void;
  resetFileBrowser: () => void;
  setFileBrowserScrollTop: (scrollTop: number) => void;
  setFileBrowserSort: (sortBy: FileBrowserState["sortBy"]) => void;
  setExpandedFolders: (expandedFolders: Set<string>) => void;
  setSearchQuery: (searchQuery: string) => void;
}

export type FileBrowserStore = FileBrowserState & FileBrowserActions;

const initialFileBrowserState: FileBrowserState = {
  currentPath: null,
  error: null,
  expandedFolders: new Set<string>(),
  fileTree: null,
  focusedItemPath: null,
  contextMenuItemPaths: new Set<string>(),
  isAtRoot: false,
  isLoading: false,
  loadingFolders: new Set<string>(),
  openContextMenu: null,
  originalPath: null,
  scrollTop: 0,
  searchQuery: "",
  selectedItemPaths: new Set<string>(),
  selectionAnchorPath: null,
  sortBy: "name",
  sortDirection: "asc",
};

interface FileBrowserDevSessionState extends Omit<
  FileBrowserState,
  "contextMenuItemPaths" | "expandedFolders" | "loadingFolders" | "selectedItemPaths"
> {
  contextMenuItemPaths: string[];
  expandedFolders: string[];
  loadingFolders: string[];
  selectedItemPaths: string[];
}

const FILE_BROWSER_SORTS = new Set<FileBrowserState["sortBy"]>(["date", "duration", "name"]);
const SORT_DIRECTIONS = new Set<FileBrowserState["sortDirection"]>(["asc", "desc"]);

function reviveNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function reviveStringSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set<string>();

  return new Set(value.filter((item): item is string => typeof item === "string"));
}

function reviveFileTree(value: unknown): FileBrowserState["fileTree"] {
  if (!isObjectRecord(value)) return null;
  if (typeof value.rootPath !== "string" || !Array.isArray(value.files)) return null;

  return value as unknown as FileBrowserState["fileTree"];
}

function reviveFileBrowserState(value: unknown): Partial<FileBrowserState> | null {
  if (!isObjectRecord(value)) return null;

  return {
    contextMenuItemPaths: new Set<string>(),
    currentPath: reviveNullableString(value.currentPath),
    error: null,
    expandedFolders: reviveStringSet(value.expandedFolders),
    fileTree: reviveFileTree(value.fileTree),
    focusedItemPath: reviveNullableString(value.focusedItemPath),
    isAtRoot: typeof value.isAtRoot === "boolean" ? value.isAtRoot : false,
    isLoading: false,
    loadingFolders: new Set<string>(),
    openContextMenu: null,
    originalPath: reviveNullableString(value.originalPath),
    scrollTop:
      typeof value.scrollTop === "number" && Number.isFinite(value.scrollTop)
        ? Math.max(0, value.scrollTop)
        : initialFileBrowserState.scrollTop,
    searchQuery:
      typeof value.searchQuery === "string"
        ? value.searchQuery
        : initialFileBrowserState.searchQuery,
    selectedItemPaths: reviveStringSet(value.selectedItemPaths),
    selectionAnchorPath: reviveNullableString(value.selectionAnchorPath),
    sortBy: FILE_BROWSER_SORTS.has(value.sortBy as FileBrowserState["sortBy"])
      ? (value.sortBy as FileBrowserState["sortBy"])
      : initialFileBrowserState.sortBy,
    sortDirection: SORT_DIRECTIONS.has(value.sortDirection as FileBrowserState["sortDirection"])
      ? (value.sortDirection as FileBrowserState["sortDirection"])
      : initialFileBrowserState.sortDirection,
  };
}

function serializeFileBrowserState(state: FileBrowserState): FileBrowserDevSessionState {
  return {
    contextMenuItemPaths: [],
    currentPath: state.currentPath,
    error: null,
    expandedFolders: [...state.expandedFolders],
    fileTree: state.fileTree,
    focusedItemPath: state.focusedItemPath,
    isAtRoot: state.isAtRoot,
    isLoading: false,
    loadingFolders: [],
    openContextMenu: null,
    originalPath: state.originalPath,
    scrollTop: state.scrollTop,
    searchQuery: state.searchQuery,
    selectedItemPaths: [...state.selectedItemPaths],
    selectionAnchorPath: state.selectionAnchorPath,
    sortBy: state.sortBy,
    sortDirection: state.sortDirection,
  };
}

const devFileBrowserState = readDevSessionState("file-browser-store", reviveFileBrowserState);

export const useFileBrowserStore = create<FileBrowserStore>()((set) => ({
  ...initialFileBrowserState,
  ...devFileBrowserState,
  setFileBrowserState: (patch) => set((state) => ({ ...state, ...patch })),
  resetFileBrowser: () =>
    set((state) => ({
      ...state,
      currentPath: null,
      contextMenuItemPaths: new Set<string>(),
      expandedFolders: new Set<string>(),
      fileTree: null,
      isAtRoot: false,
      isLoading: false,
      loadingFolders: new Set<string>(),
      originalPath: null,
      searchQuery: "",
      selectedItemPaths: new Set<string>(),
      selectionAnchorPath: null,
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
          : sortBy === "date"
            ? "desc"
            : "asc",
    })),
  setExpandedFolders: (expandedFolders) => set({ expandedFolders }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));

registerDevSessionState("file-browser-store", useFileBrowserStore, serializeFileBrowserState);

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
      modifiedAtMs: item.modifiedAtMs,
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
