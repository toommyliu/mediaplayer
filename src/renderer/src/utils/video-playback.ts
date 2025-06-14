import { playerState, playlistState } from "../state.svelte";
import { logger } from "../utils/logger";

/**
 * Plays a video from the source URL.
 *
 * @param src - The source URL of the video to play.
 */
export const playVideo = (src: string): void => {
  logger.debug(`playVideo: ${src}`);

  playerState.isLoading = true;
  playerState.error = null;

  const normalizedSrc = src.startsWith("file://") ? src : `file://${src}`;

  let idx = playerState.queue.findIndex((item) => item === normalizedSrc);

  if (idx === -1) {
    // Video not in queue, add it
    playerState.queue.push(normalizedSrc);
    idx = playerState.queue.length - 1;
  }

  playerState.currentIndex = idx;
  playerState.currentTime = 0;

  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }
};

/**
 * Plays the previous video in the queue, cycling to the last video if at the beginning.
 */
export const previousVideo = () => {
  if (playerState.queue.length === 0) return;

  let newIndex = playerState.currentIndex - 1;
  if (newIndex < 0) {
    newIndex = playerState.queue.length - 1;
  }

  console.log("previousVideo: changing index from", playerState.currentIndex, "to", newIndex);
  console.log("previousVideo: queue length:", playerState.queue.length);
  console.log("previousVideo: new video will be:", playerState.queue[newIndex]);

  playerState.currentIndex = newIndex;
  playerState.currentTime = 0;

  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }
};

/**
 * Plays the next video in the queue, cycling to the first video if at the end.
 */
export const nextVideo = () => {
  if (playerState.queue.length === 0) return;

  let newIndex = playerState.currentIndex + 1;
  if (newIndex >= playerState.queue.length) {
    newIndex = 0;
  }

  console.log("nextVideo: changing index from", playerState.currentIndex, "to", newIndex);
  console.log("nextVideo: queue length:", playerState.queue.length);
  console.log("nextVideo: new video will be:", playerState.queue[newIndex]);

  playerState.currentIndex = newIndex;
  playerState.currentTime = 0;

  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }
};

/**
 * Seeks to a relative time in the current video.
 *
 * @param time - The time in seconds to seek to.
 */
export const seekToRelative = (time: number) => {
  if (!playerState.videoElement) return;

  const newTime = playerState.videoElement.currentTime + time;
  const clampedTime = Math.max(0, Math.min(newTime, playerState.videoElement.duration || 0));
  playerState.videoElement.currentTime = clampedTime;
  playerState.currentTime = clampedTime;
};

/**
 * Plays the next video from the current playlist.
 */
export const nextPlaylistVideo = () => {
  const currentPlaylist = playlistState.currentPlaylist;
  if (!currentPlaylist || currentPlaylist.items.length === 0) {
    return nextVideo();
  }

  const currentVideo = playerState.currentVideo;
  if (!currentVideo) {
    const firstItem = currentPlaylist.items[0];
    playVideo(`file://${firstItem.path}`);
    return;
  }

  const currentPath = currentVideo.replace("file://", "");
  const currentIndex = currentPlaylist.items.findIndex((item) => item.path === currentPath);

  if (currentIndex !== -1 && currentIndex < currentPlaylist.items.length - 1) {
    const nextItem = currentPlaylist.items[currentIndex + 1];
    playVideo(`file://${nextItem.path}`);
  } else {
    // Loop back to first video
    const firstItem = currentPlaylist.items[0];
    playVideo(`file://${firstItem.path}`);
  }
};

/**
 * Plays the previous video from the current playlist.
 */
export const previousPlaylistVideo = () => {
  const currentPlaylist = playlistState.currentPlaylist;
  if (!currentPlaylist || currentPlaylist.items.length === 0) {
    // Fall back to queue navigation if no playlist
    return previousVideo();
  }

  const currentVideo = playerState.currentVideo;
  if (!currentVideo) {
    // Play last video in playlist
    const lastItem = currentPlaylist.items[currentPlaylist.items.length - 1];
    playVideo(`file://${lastItem.path}`);
    return;
  }

  const currentPath = currentVideo.replace("file://", "");
  const currentIndex = currentPlaylist.items.findIndex((item) => item.path === currentPath);

  if (currentIndex > 0) {
    const prevItem = currentPlaylist.items[currentIndex - 1];
    playVideo(`file://${prevItem.path}`);
  } else {
    // Loop back to last video
    const lastItem = currentPlaylist.items[currentPlaylist.items.length - 1];
    playVideo(`file://${lastItem.path}`);
  }
};
