export const playerState = $state<PlayerState>({
  // Playback
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  error: null,
  showControls: true,
  queue: [],
  isFullscreen: false,

  get currentVideo() {
    return this.queue[this.currentIndex] || null;
  },
  currentIndex: 0,

  // Volume control
  volume: 1,
  isMuted: false,

  // Video element reference
  videoElement: null
});

export const sidebarState = $state<SidebarState>({
  isOpen: true
  // width: -1
});

export const platformState = $state<PlatformState>({
  isMac: false,
  isWindows: false,
  isLinux: false
});

export const fileBrowserState = $state<FileBrowserState>({
  fileSystem: [],
  expandedFolders: new Set<string>(),
  error: null,
  openContextMenu: null,
  currentPath: null,
  isAtRoot: false,
  originalPath: null,
  sortBy: "name",
  sortDirection: "asc"
});

export const playlistState = $state<PlaylistState>({
  playlists: [
    {
      id: "default",
      name: "Default Playlist",
      description: "Default playlist for all videos",
      items: [],
      createdAt: new Date(),
      lastModified: new Date()
    }
  ],
  currentPlaylistId: "default",
  get currentPlaylist() {
    return this.playlists.find((p) => p.id === this.currentPlaylistId) || null;
  },
  get currentPlaylistItems() {
    return this.currentPlaylist?.items || [];
  }
});

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

type PlaylistState = {
  playlists: Playlist[];
  currentPlaylistId: string;
  get currentPlaylist(): Playlist | null;
  get currentPlaylistItems(): PlaylistItem[];
};

type PlayerState = {
  // Playback
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  showControls: boolean;
  queue: string[];

  get currentVideo(): string | null;
  currentIndex: number;

  isFullscreen: boolean;

  // Volume control
  volume: number;
  isMuted: boolean;

  // Video element reference
  videoElement: HTMLVideoElement | null;
};

type SidebarState = {
  isOpen: boolean;
  // width: number;
};

type PlatformState = {
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
};

export type FileSystemItem = {
  name: string;
  type: "folder" | "video" | "file";
  path: string;
  size?: number;
  duration?: number;
  children?: FileSystemItem[];
};

type FileBrowserState = {
  fileSystem: FileSystemItem[];
  expandedFolders: Set<string>;
  error: string | null;
  openContextMenu: string | null;
  currentPath: string | null;
  isAtRoot: boolean;
  originalPath: string | null;
  sortBy: "name" | "duration";
  sortDirection: "asc" | "desc";
};
