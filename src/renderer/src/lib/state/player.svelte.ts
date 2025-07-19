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

  public currentVideo = $state<string | null>(null);

  public reset() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
  }
}

export const playerState = new PlayerState();
