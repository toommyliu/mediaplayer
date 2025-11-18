import { queue } from "./queue.svelte";
import { logger } from "../logger";

class PlayerState {
  public isPlaying = $state(false);

  public currentTime = $state(0);

  public duration = $state(0);

  public isLoading = $state(false);

  public error = $state<string | null>(null);

  public showControls = $state(true);

  public isFullscreen = $state(false);


  public videoElement = $state<HTMLVideoElement | null>(null);

  public currentVideo = $state<string | null>(null);

  public reset() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
  }

  /**
   * Plays a video from the source URL.
   *
   * @param src - The source URL of the video to play.
   */
  public playVideo(src: string): void {
    logger.debug(`playVideo: ${src}`);

    this.isLoading = true;
    this.error = null;

    const videoUrl = src.startsWith("file://") ? src : `file://${src}`;
    this.currentVideo = videoUrl;

    const queueIndex = queue.items.findIndex((item) => item.path === src);

    if (queueIndex === -1) {
      console.warn("Video not found in queue:", src);
      console.warn("Current queue items:", queue.items);
      return;
    }

    queue.index = queueIndex;
    this.currentTime = 0;
    this.isPlaying = true;

    if (this.videoElement) {
      this.videoElement.currentTime = 0;
      this.videoElement.load();
    }
  }

  public async togglePlayPause() {
    if (!this.videoElement || !queue.currentItem) return;

    if (this.isPlaying) {
      this.videoElement?.pause();
      this.isPlaying = false;
    } else {
      try {
        await this.videoElement?.play();
        this.isPlaying = true;
      } catch (e) {
        console.warn("play() failed");
      }
    }
  }

  public async playPreviousVideo() {
    if (!this.videoElement || !queue.currentItem) return;
    if (queue.items.length === 0) return;

    let newIndex = queue.index - 1;

    if (newIndex < 0) {
      // Repeat Mode All: go to last item
      if (queue.repeatMode === "all") {
        newIndex = queue.items.length - 1;
      } else {
        // Repeat Mode Off/One: stop playback of video
        //
        this.isPlaying = false;
        this.videoElement?.pause();
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

  public async playNextVideo() {
    if (!this.videoElement || !queue.currentItem) return;
    if (queue.items.length === 0) return;

    let newIndex = queue.index + 1;

    if (newIndex >= queue.items.length) {
      if (queue.repeatMode === "all") {
        newIndex = 0;
      } else {
        this.isPlaying = false;
        this.videoElement?.pause();
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
