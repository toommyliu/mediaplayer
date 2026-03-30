import type { FileTreeItem } from "../../shared";

export type SidebarTab = "file-browser" | "queue";
export type RepeatMode = "all" | "off" | "one";
export type SidebarPosition = "left" | "right";
export type NotificationPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export type AspectRatioMode = "contain" | "cover" | "fill";

export interface QueueItem {
  duration?: number;
  id: string;
  name: string;
  path: string;
}

export type FileSystemItem = FileTreeItem;

export interface FileTree {
  files: FileSystemItem[];
  rootPath: string;
}

export interface PlatformState {
  isLinux: boolean;
  isMac: boolean;
  isWindows: boolean;
  pathSep: string;
}

export interface HotkeyAction {
  configurable?: boolean;
  description: string;
  enabled?: boolean;
  id: string;
  keys: string[];
}

export interface HotkeyCategory {
  actions: HotkeyAction[];
  name: string;
}

export interface AppState {
  fileBrowser: {
    currentPath: string | null;
    error: string | null;
    expandedFolders: Set<string>;
    fileTree: FileTree | null;
    focusedItemPath: string | null;
    isAtRoot: boolean;
    isLoading: boolean;
    loadingFolders: Set<string>;
    openContextMenu: string | null;
    originalPath: string | null;
    scrollTop: number;
    sortBy: "duration" | "name";
    sortDirection: "asc" | "desc";
  };
  hotkeys: {
    categories: HotkeyCategory[];
    enabled: boolean;
    initialized: boolean;
    modKey: string;
  };
  notifications: {
    upNextEnabled: boolean;
    upNextPosition: NotificationPosition;
    videoInfoEnabled: boolean;
  };
  platform: PlatformState;
  player: {
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
  };
  queue: {
    index: number;
    items: QueueItem[];
    repeatMode: RepeatMode;
  };
  settings: {
    showDialog: boolean;
  };
  sidebar: {
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
  volume: {
    isMuted: boolean;
    value: number;
  };
}
