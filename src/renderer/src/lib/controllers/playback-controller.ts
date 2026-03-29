import { enterFullscreen, exitFullscreen } from "@/lib/ipc";
import { normalizeVideoPath, toFileUrl } from "@/lib/media-path";
import { bindVideoElement, getVideoElement } from "@/lib/controllers/media-runtime";
import {
  getCurrentQueueItemFromState,
  getQueueState,
  setQueueIndex
} from "@/lib/state/queue";
import { getPlayerState, setCurrentTime, setPlayerState } from "@/lib/state/player";

export function bindPlaybackVideoElement(element: HTMLVideoElement | null): void {
  bindVideoElement(element);
}

export function pausePlayback(): void {
  const videoElement = getVideoElement();
  videoElement?.pause();
  setPlayerState({ isPlaying: false });
}

export function stopPlayback(clearCurrentVideo = false): void {
  const videoElement = getVideoElement();
  videoElement?.pause();
  if (videoElement) {
    videoElement.currentTime = 0;
  }

  const player = getPlayerState();
  setPlayerState({
    currentTime: 0,
    currentVideo: clearCurrentVideo ? null : player.currentVideo,
    isPlaying: false
  });
}

export function playVideo(src: string): void {
  const normalized = normalizeVideoPath(src);
  const queue = getQueueState();
  const queueIndex = queue.items.findIndex((item) => item.path === normalized);
  if (queueIndex === -1) return;

  setPlayerState({
    currentTime: 0,
    currentVideo: toFileUrl(normalized),
    error: null,
    isLoading: true,
    isPlaying: true
  });
  setQueueIndex(queueIndex);

  const videoElement = getVideoElement();
  if (videoElement) {
    videoElement.currentTime = 0;
    videoElement.load();
  }
}

export async function playNextVideo(): Promise<void> {
  const videoElement = getVideoElement();
  const queue = getQueueState();
  const currentItem = getCurrentQueueItemFromState(queue);

  if (!videoElement || !currentItem) return;
  if (queue.items.length === 0) return;

  let nextIndex = queue.index + 1;
  if (nextIndex >= queue.items.length) {
    if (queue.repeatMode === "all") {
      nextIndex = 0;
    } else {
      videoElement.pause();
      setPlayerState({ isPlaying: false });
      return;
    }
  }

  const item = queue.items[nextIndex];
  setPlayerState({
    currentTime: 0,
    currentVideo: toFileUrl(item.path)
  });
  setQueueIndex(nextIndex);

  videoElement.currentTime = 0;
  videoElement.load();
}

export async function playPreviousVideo(): Promise<void> {
  const videoElement = getVideoElement();
  const queue = getQueueState();
  const currentItem = getCurrentQueueItemFromState(queue);

  if (!videoElement || !currentItem) return;
  if (queue.items.length === 0) return;

  let nextIndex = queue.index - 1;
  if (nextIndex < 0) {
    if (queue.repeatMode === "all") {
      nextIndex = queue.items.length - 1;
    } else {
      videoElement.pause();
      setPlayerState({ isPlaying: false });
      return;
    }
  }

  const item = queue.items[nextIndex];
  setPlayerState({
    currentTime: 0,
    currentVideo: toFileUrl(item.path)
  });
  setQueueIndex(nextIndex);

  videoElement.currentTime = 0;
  videoElement.load();
}

export async function togglePlayPause(): Promise<void> {
  const videoElement = getVideoElement();
  const queue = getQueueState();
  const currentItem = getCurrentQueueItemFromState(queue);

  if (!videoElement || !currentItem) return;

  if (getPlayerState().isPlaying) {
    videoElement.pause();
    setPlayerState({ isPlaying: false });
    return;
  }

  try {
    await videoElement.play();
    setPlayerState({ isPlaying: true });
  } catch {
    // Ignore autoplay failures.
  }
}

export async function setFullscreen(isFullscreen: boolean): Promise<void> {
  setPlayerState({ isFullscreen });
  if (isFullscreen) {
    await enterFullscreen();
  } else {
    await exitFullscreen();
  }
}

export function setPlaybackCurrentTime(currentTime: number): void {
  setCurrentTime(currentTime);
}
