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

export const playlistState = $state<PlaylistState>({
  playlists: [
    {
      id: "default",
      name: "Default Playlist",
      items: [
        { id: "1", name: "Sample Video 1.mp4", path: "/path/to/video1.mp4", duration: 120 },
        { id: "2", name: "Sample Video 2.mkv", path: "/path/to/video2.mkv", duration: 95 }
      ],
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

export type PlaylistItem = {
  id: string;
  name: string;
  path: string;
  duration?: number;
  size?: number;
  addedAt?: Date;
};

export type Playlist = {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: Date;
  lastModified: Date;
  description?: string;
};

type PlaylistState = {
  playlists: Playlist[];
  currentPlaylistId: string;

  get currentPlaylist(): Playlist | null;
  get currentPlaylistItems(): PlaylistItem[];
};
