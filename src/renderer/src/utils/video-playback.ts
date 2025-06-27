import { playerState } from "../state.svelte";
import { logger } from "./logger";

/**
 * Plays a video from the source URL.
 *
 * @param src - The source URL of the video to play.
 */
export function playVideo(src: string): void {
  logger.debug(`playVideo: ${src}`);

  playerState.isLoading = true;
  playerState.error = null;

  const normalizedSrc = src.startsWith("file://") ? src : `file://${src}`;

  // Find the item in the queue by path
  const queueIndex = playerState.queue.findIndex((item) => `file://${item.path}` === normalizedSrc);

  if (queueIndex === -1) {
    // Video not in queue - this shouldn't happen in the new queue-only system
    console.warn("Video not found in queue:", normalizedSrc);
    return;
  }

  playerState.currentIndex = queueIndex;

  playerState.currentTime = 0;

  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }
}

/**
 * Plays the previous video in the queue, cycling to the last video if at the beginning.
 */
export function playPreviousVideo(): void {
  if (!playerState.videoElement || !playerState.currentVideo) return;
  if (playerState.queue.length === 0) return;

  let newIndex = playerState.currentIndex - 1;
  if (newIndex < 0) {
    newIndex = playerState.queue.length - 1;
  }

  console.log("previousVideo: changing index from", playerState.currentIndex, "to", newIndex);
  console.log("previousVideo: queue length:", playerState.queue.length);

  playerState.currentIndex = newIndex;
  playerState.currentTime = 0;

  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }
}

/**
 * Plays the next video in the queue, cycling to the first video if at the end.
 */
export function playNextVideo(): void {
  if (!playerState.videoElement || !playerState.currentVideo) return;
  if (playerState.queue.length === 0) return;

  let newIndex = playerState.currentIndex + 1;
  if (newIndex >= playerState.queue.length) {
    newIndex = 0;
  }

  console.log("nextVideo: changing index from", playerState.currentIndex, "to", newIndex);
  console.log("nextVideo: queue length:", playerState.queue.length);

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
