export const playerState = $state<PlayerState>({
  // Playback
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  error: null,
  showControls: true,
  queue: [],

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
