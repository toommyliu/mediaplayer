import { playerState, playlistState } from "../state.svelte";
import { PlaylistManager } from "./playlist";

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
 * @param addToPlaylist - Whether to add the video to the current playlist if not already there.
 */
export const playVideo = (src: string, addToPlaylist: boolean = false) => {
  playerState.isLoading = true;
  playerState.error = null;

  // Normalize the src to ensure it has the file:// protocol
  const normalizedSrc = src.startsWith("file://") ? src : `file://${src}`;

  // If addToPlaylist is true, add to current playlist if not already there
  if (addToPlaylist) {
    const filePath = normalizedSrc.replace("file://", "");
    const fileName = filePath.split("/").pop() || "Unknown";

    const existingItem = playlistState.currentPlaylistItems.find((item) => item.path === filePath);

    if (!existingItem) {
      PlaylistManager.addItemToPlaylist(playlistState.currentPlaylistId, {
        name: fileName,
        path: filePath
      });
    }
  }

  // Find the video in the queue or add it
  let idx = playerState.queue.findIndex((item) => item === normalizedSrc);

  if (idx === -1) {
    // Video not in queue, add it
    playerState.queue.push(normalizedSrc);
    idx = playerState.queue.length - 1;
  }

  // Set the current index to play this video
  playerState.currentIndex = idx;
  playerState.currentTime = 0;

  // If video element exists, load and play the video
  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    playerState.videoElement.load();
  }

  console.log("playVideo: Playing video", normalizedSrc, "at index", idx);
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

  // Ensure the video element loads the new source
  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    // Force the video element to load the new source
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

  // Ensure the video element loads the new source
  if (playerState.videoElement) {
    playerState.videoElement.currentTime = 0;
    // Force the video element to load the new source
    playerState.videoElement.load();
  }
};

/**
 * Plays the next video from the current playlist.
 */
export const nextPlaylistVideo = () => {
  const currentPlaylist = playlistState.currentPlaylist;
  if (!currentPlaylist || currentPlaylist.items.length === 0) return;

  const currentVideo = playerState.currentVideo;
  if (!currentVideo) {
    // Play first video in playlist
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
  if (!currentPlaylist || currentPlaylist.items.length === 0) return;

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

/**
 * Syncs the player queue with the current playlist.
 */
export const syncQueueWithPlaylist = () => {
  const currentPlaylist = playlistState.currentPlaylist;
  if (!currentPlaylist) {
    playerState.queue = [];
    return;
  }

  playerState.queue = currentPlaylist.items.map((item) => `file://${item.path}`);

  // Update current index if video is playing
  const currentVideo = playerState.currentVideo;
  if (currentVideo) {
    const idx = playerState.queue.findIndex((item) => item === currentVideo);
    if (idx !== -1) {
      playerState.currentIndex = idx;
    }
  }
};
