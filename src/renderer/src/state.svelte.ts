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
  openContextMenu: null
});

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
};
