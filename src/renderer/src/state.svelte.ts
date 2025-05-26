type State = {
  // Playback
  videoSrc: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  showControls: boolean;

  // Volume control
  volume: number;
  isMuted: boolean;
};

export const playerState = $state<State>({
  videoSrc: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  error: null,
  showControls: true,

  volume: 1,
  isMuted: false
});
