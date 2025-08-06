import { queue } from "./queue.svelte";

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

  public async togglePlayPause() {
    if (!this.videoElement || !queue.currentItem) return;

    if (this.isPlaying) {
      this.videoElement.pause();
      this.isPlaying = false;
    } else {
      try {
        await this.videoElement?.play();
        this.isPlaying = true;
      } catch {}
    }
  }

  public async playPrevious() {
    if (!this.videoElement || !queue.currentItem) return;
    if (queue.items.length === 0) return;

    let newIndex = queue.index - 1;

    if (newIndex < 0) {
      if (queue.repeatMode === "all") {
        newIndex = queue.items.length - 1;
      } else {
        this.isPlaying = false;
        if (this.videoElement) {
          this.videoElement.pause();
        }

        return;
      }
    }

    console.log("previousVideo: changing index from", queue.index, "to", newIndex);
    console.log("previousVideo: queue length:", queue.items.length);
    console.log("previousVideo: repeat mode:", queue.repeatMode);

    queue.index = newIndex;
    const currentItem = queue.currentItem;
    if (currentItem) this.currentVideo = `file://${currentItem.path}`;

    this.currentTime = 0;

    if (this.videoElement) {
      this.videoElement.currentTime = 0;
      this.videoElement.load();
    }
  }

  public async playNext() {
    if (!this.videoElement || !queue.currentItem) return;
    if (queue.items.length === 0) return;

    let newIndex = queue.index + 1;

    if (newIndex >= queue.items.length) {
      if (queue.repeatMode === "all") {
        newIndex = 0;
      } else {
        this.isPlaying = false;
        if (this.videoElement) {
          this.videoElement.pause();
        }

        return;
      }
    }

    console.log("nextVideo: changing index from", queue.index, "to", newIndex);
    console.log("nextVideo: queue length:", queue.items.length);
    console.log("nextVideo: repeat mode:", queue.repeatMode);

    queue.index = newIndex;
    const currentItem = queue.currentItem;
    if (currentItem) this.currentVideo = `file://${currentItem.path}`;

    this.currentTime = 0;

    if (this.videoElement) {
      this.videoElement.currentTime = 0;
      this.videoElement.load();
    }
  }
}

export const playerState = new PlayerState();
