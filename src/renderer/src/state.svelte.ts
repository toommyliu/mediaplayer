import { SidebarTab } from "./types";

class PlayerState {
  // Playback
  isPlaying = $state(false);

  currentTime = $state(0);

  duration = $state(0);

  isLoading = $state(false);

  error = $state<string | null>(null);

  showControls = $state(true);

  queue = $state<string[]>([]);

  currentIndex = $state(0);

  isFullscreen = $state(false);

  get currentVideo() {
    return this.queue[this.currentIndex] || null;
  }

  // Volume control
  volume = $state(1);

  isMuted = $state(false);

  // Video element reference
  videoElement = $state<HTMLVideoElement | null>(null);
}

export const playerState = new PlayerState();

class SidebarState {
  isOpen = $state(true);

  currentTab = $state<SidebarTab>(SidebarTab.FileBrowser);
}

export const sidebarState = new SidebarState();

class PlatformState {
  public isMac = $state(false);

  public isWindows = $state(false);

  public isLinux = $state(false);

  public pathSep = $state("");
}

export const platformState = new PlatformState();

class FileBrowserState {
  fileTree = $state<FileTree | null>(null);

  expandedFolders = $state(new Set<string>());

  error = $state<string | null>(null);

  openContextMenu = $state<string | null>(null);

  currentPath = $state<string | null>(null);

  isAtRoot = $state(false);

  originalPath = $state<string | null>(null);

  sortBy = $state<"duration" | "name">("name");

  sortDirection = $state<"asc" | "desc">("asc");

  searchQuery = $state("");

  isLoading = $state(false);

  loadingFolders = $state(new Set<string>());

  get fileSystem() {
    return this.fileTree?.files || [];
  }
}

export const fileBrowserState = new FileBrowserState();

// Playlist Types
export type PlaylistItem = {
  addedAt: Date;
  duration?: number;
  id: string;
  name?: string;
  path: string;
  size?: number;
};

export type Playlist = {
  createdAt: Date;
  description?: string;
  id: string;
  items: PlaylistItem[];
  lastModified: Date;
  name: string;
};

class PlaylistState {
  playlists = $state<Playlist[]>([]);

  currentPlaylistId = $state<string>("default");

  hasUnsavedChanges = $state<boolean>(false);

  get currentPlaylist(): Playlist | null {
    return this.playlists.find((p) => p.id === this.currentPlaylistId) || null;
  }

  get currentPlaylistItems(): PlaylistItem[] {
    return this.currentPlaylist?.items || [];
  }
}

export const playlistState = new PlaylistState();

export type FileSystemItem = {
  duration?: number;
  files?: FileSystemItem[];
  name?: string;
  path?: string;
  type?: "folder" | "video";
};

export type FileTree = {
  files: FileSystemItem[];
  rootPath: string;
};

export type DirectoryContents = {
  currentPath: string;
  files: FileSystemItem[];
  isAtRoot: boolean;
  parentPath: string | null;
};
