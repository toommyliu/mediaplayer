import type { FileTreeItem } from "../../shared";

export type SidebarTab = "file-browser" | "playlists" | "queue";
export type RepeatMode = "all" | "off" | "one";
export type WindowBlurAction = "mute" | "none" | "pause";
export type SidebarPosition = "left" | "right";
export type NotificationPosition
  = | "top-left"
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

export interface Playlist {
  createdAt: number;
  id: string;
  items: QueueItem[];
  lastPlayedAt?: number;
  name: string;
  updatedAt: number;
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
    contextMenuItemPaths: Set<string>;
    isAtRoot: boolean;
    isLoading: boolean;
    loadingFolders: Set<string>;
    openContextMenu: string | null;
    originalPath: string | null;
    scrollTop: number;
    searchQuery: string;
    selectedItemPaths: Set<string>;
    selectionAnchorPath: string | null;
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
    isPictureInPicture: boolean;
    isPictureInPictureSupported: boolean;
    isPlaying: boolean;
    isQuickJumpOpen: boolean;
    playbackRate: number;
    seekUndoStack: Array<{ time: number; video: string | null }>;
    showControls: boolean;
  };
  queue: {
    index: number;
    items: QueueItem[];
    repeatMode: RepeatMode;
  };
  playlists: {
    playlists: Playlist[];
  };
  settings: {
    showDialog: boolean;
    windowBlurAction: WindowBlurAction;
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
    boost: number;
    isMuted: boolean;
    value: number;
  };
}
