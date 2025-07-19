class PlayerState {
  public isPlaying = $state(false);

  public currentTime = $state(0);

  public duration = $state(0);

  public isLoading = $state(false);

  public error = $state<string | null>(null);

  public showControls = $state(true);

  public isFullscreen = $state(false);

  public repeatMode = $state<"all" | "off" | "one">("off");

  public videoElement = $state<HTMLVideoElement | null>(null);
}

export const playerState = new PlayerState();
