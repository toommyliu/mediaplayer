import { playerState } from "../state.svelte";

/**
 * Plays a video from the source URL.
 *
 * @param src - The source URL of the video to play.
 */
export const playVideo = (src: string) => {
  playerState.isLoading = false;
  playerState.error = null;

  const idx = playerState.queue.flatMap((item) => item).findIndex((item) => item === src);

  if (idx !== -1) {
    playerState.currentIndex = idx;
  }
};
