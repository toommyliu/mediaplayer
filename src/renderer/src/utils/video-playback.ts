import { playerState } from "../state.svelte";

/**
 * Resets the video player state.
 */
export const resetPlayer = () => {
  playerState.currentIndex = 0;
  playerState.queue = [];
  playerState.isLoading = false;
  playerState.error = null;
};

/**
 * Sets the queue for the video player.
 *
 * @param queue - An array of video source URLs to set as the queue.
 */
export const setQueue = (queue: string[]) => {
  playerState.queue = queue.map((src) => `file://${src}`);
};

/**
 * Plays a video from the source URL.
 *
 * @param src - The source URL of the video to play.
 */
export const playVideo = (src: string) => {
  playerState.isLoading = false;
  playerState.error = null;

  const idx = playerState.queue.findIndex((item) => item === src);

  if (idx !== -1) {
    playerState.currentIndex = idx;
  }
};

/**
 * Plays the previous video in the queue.
 */
export const previousVideo = () => {
  if (playerState.queue.length === 0) return;

  const newIndex = playerState.currentIndex - 1;
  if (newIndex >= 0) {
    playerState.currentIndex = newIndex;
    playerState.currentTime = 0;
    playerState.videoElement.currentTime = 0;
  }
};

/**
 * Plays the next video in the queue.
 */
export const nextVideo = () => {
  if (playerState.queue.length === 0) return;

  const newIndex = playerState.currentIndex + 1;
  if (newIndex < playerState.queue.length) {
    playerState.currentIndex = newIndex;
    playerState.currentTime = 0;
    playerState.videoElement!.currentTime = 0;
  }
};
