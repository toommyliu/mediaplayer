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

  const queueIndex = queue.items.findIndex((item) => item.path === src);

  if (queueIndex === -1) {
    console.warn("Video not found in queue:", src);
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

  // Handle repeat modes when reaching the beginning of the queue
  if (newIndex < 0) {
    if (queue.repeatMode === "all") {
      // Loop back to the last video
      newIndex = playerState.queue.length - 1;
    } else {
      // For "off" mode, stop at the beginning
      playerState.isPlaying = false;
      if (playerState.videoElement) {
        playerState.videoElement.pause();
      }

      return;
    }
  }

  console.log("previousVideo: changing index from", playerState.currentIndex, "to", newIndex);
  console.log("previousVideo: queue length:", playerState.queue.length);
  console.log("previousVideo: repeat mode:", playerState.repeatMode);

  playerState.currentIndex = newIndex;
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
  if (!playerState.videoElement || !playerState.currentVideo) return;
  if (playerState.queue.length === 0) return;

  let newIndex = playerState.currentIndex + 1;

  // Handle repeat modes when reaching the end of the queue
  if (newIndex >= playerState.queue.length) {
    if (playerState.repeatMode === "all") {
      // Loop back to the first video
      newIndex = 0;
    } else {
      // For "off" mode, stop at the end
      playerState.isPlaying = false;
      if (playerState.videoElement) {
        playerState.videoElement.pause();
      }

      return;
    }
  }

  console.log("nextVideo: changing index from", playerState.currentIndex, "to", newIndex);
  console.log("nextVideo: queue length:", playerState.queue.length);
  console.log("nextVideo: repeat mode:", playerState.repeatMode);

  playerState.currentIndex = newIndex;
  playerState.currentTime = 0;

  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }
}

/**
 * Seeks to a time relative to the current playback position.
 *
 * @param time - The time in seconds to seek to.
 */
export function seekToRelative(time: number): void {
  if (!playerState.videoElement) return;

  const newTime = playerState.videoElement.currentTime + time;
  const clampedTime = Math.max(0, Math.min(newTime, playerState.videoElement.duration || 0));
  playerState.videoElement.currentTime = clampedTime;
  playerState.currentTime = clampedTime;
}
