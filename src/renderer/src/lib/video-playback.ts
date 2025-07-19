import { logger } from "./logger";
import { playerState } from "./state/player.svelte";
import { queue } from "./state/queue.svelte";

export async function playVideoElement() {
  await playerState.videoElement?.play().catch((error) => {
    logger.error("Error playing video element:", error);
  });
}

/**
 * Plays a video from the source URL.
 *
 * @param src - The source URL of the video to play.
 */
export function playVideo(src: string): void {
  logger.debug(`playVideo: ${src}`);

  playerState.isLoading = true;
  playerState.error = null;

  const videoUrl = src.startsWith("file://") ? src : `file://${src}`;
  playerState.currentVideo = videoUrl;

  const queueIndex = queue.items.findIndex((item) => item.path === src);

  if (queueIndex === -1) {
    console.warn("Video not found in queue:", src);
    console.warn("Current queue items:", queue.items);
    return;
  }

  queue.index = queueIndex;
  playerState.currentTime = 0;

  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }
}

/**
 * Plays the previous video in the queue, respecting repeat modes.
 */
export function playPreviousVideo(): void {
  if (!playerState.videoElement || !queue.currentItem) return;
  if (queue.items.length === 0) return;

  let newIndex = queue.index - 1;

  if (newIndex < 0) {
    if (queue.repeatMode === "all") {
      newIndex = queue.items.length - 1;
    } else {
      playerState.isPlaying = false;
      if (playerState.videoElement) {
        playerState.videoElement.pause();
      }

      return;
    }
  }

  console.log("previousVideo: changing index from", queue.index, "to", newIndex);
  console.log("previousVideo: queue length:", queue.items.length);
  console.log("previousVideo: repeat mode:", queue.repeatMode);

  queue.index = newIndex;
  const currentItem = queue.currentItem;
  if (currentItem) {
    playerState.currentVideo = `file://${currentItem.path}`;
  }
  playerState.currentTime = 0;

  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }
}

/**
 * Plays the next video in the queue, respecting repeat modes.
 */
export function playNextVideo(): void {
  if (!playerState.videoElement || !queue.currentItem) return;
  if (queue.items.length === 0) return;

  let newIndex = queue.index + 1;

  if (newIndex >= queue.items.length) {
    if (queue.repeatMode === "all") {
      newIndex = 0;
    } else {
      playerState.isPlaying = false;
      if (playerState.videoElement) {
        playerState.videoElement.pause();
      }

      return;
    }
  }

  console.log("nextVideo: changing index from", queue.index, "to", newIndex);
  console.log("nextVideo: queue length:", queue.items.length);
  console.log("nextVideo: repeat mode:", queue.repeatMode);

  queue.index = newIndex;
  const currentItem = queue.currentItem;
  if (currentItem) {
    playerState.currentVideo = `file://${currentItem.path}`;
  }
  playerState.currentTime = 0;

  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }
}
