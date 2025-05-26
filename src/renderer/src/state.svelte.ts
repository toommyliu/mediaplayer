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
  isMuted: false
});

export const sidebarState = $state<SidebarState>({
  isOpen: true
  // width: -1
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
};

type SidebarState = {
  isOpen: boolean;
  // width: number;
};
