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
  isMac = $state(false);
  isWindows = $state(false);
  isLinux = $state(false);
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
  sortBy = $state<"name" | "duration">("name");
  sortDirection = $state<"asc" | "desc">("asc");
  searchQuery = $state("");

  get fileSystem() {
    return this.fileTree?.files || [];
  }
}

export const fileBrowserState = new FileBrowserState();

class PlaylistState {
  playlists = $state<Playlist[]>([
    {
      id: "default",
      name: "Default Playlist",
      description: "Default playlist for all videos",
      items: [],
      createdAt: new Date(),
      lastModified: new Date()
    }
  ]);
  currentPlaylistId = $state("default");

  get currentPlaylist() {
    return this.playlists.find((p) => p.id === this.currentPlaylistId) || null;
  }

  get currentPlaylistItems() {
    return this.currentPlaylist?.items || [];
  }
}

export const playlistState = new PlaylistState();

export type PlaylistItem = {
  id: string;
  name: string;
  path: string;
  duration?: number;
  size?: number;
  addedAt: Date;
};

export type Playlist = {
  id: string;
  name: string;
  description?: string;
  items: PlaylistItem[];
  createdAt: Date;
  lastModified: Date;
};

export type FileSystemItem = {
  name?: string;
  type?: "folder" | "video";
  path?: string;
  duration?: number;
  files?: FileSystemItem[];
};

export type FileTree = {
  rootPath: string;
  files: FileSystemItem[];
};

export type DirectoryContents = {
  currentPath: string;
  parentPath: string | null;
  isAtRoot: boolean;
  files: FileSystemItem[];
};
