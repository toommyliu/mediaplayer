import { enterFullscreen, exitFullscreen } from "@/lib/ipc";
import { normalizeVideoPath, toFileUrl } from "@/lib/media-path";
import { bindVideoElement, getVideoElement } from "@/video-element";
import { usePlayerStore } from "@/stores/player";
import { getCurrentQueueItemFromState, useQueueStore } from "@/stores/queue";

export function bindPlaybackVideoElement(element: HTMLVideoElement | null): void {
  bindVideoElement(element);
}

export function pausePlayback(): void {
  const videoElement = getVideoElement();
  videoElement?.pause();
  usePlayerStore.getState().setPlayerState({ isPlaying: false });
}

export function stopPlayback(clearCurrentVideo = false): void {
  const videoElement = getVideoElement();
  videoElement?.pause();
  if (videoElement) {
    videoElement.currentTime = 0;
  }

  const player = usePlayerStore.getState();
  player.setPlayerState({
    currentTime: 0,
    currentVideo: clearCurrentVideo ? null : player.currentVideo,
    isPlaying: false
  });
}

export function playVideo(src: string): void {
  const normalized = normalizeVideoPath(src);
  const queue = useQueueStore.getState();
  const queueIndex = queue.items.findIndex(
    (item) => normalizeVideoPath(item.path) === normalizeVideoPath(normalized)
  );
  if (queueIndex === -1) return;

  usePlayerStore.getState().setPlayerState({
    currentTime: 0,
    currentVideo: toFileUrl(normalized),
    error: null,
    isLoading: true,
    isPlaying: true
  });
  useQueueStore.getState().setQueueIndex(queueIndex);

  const videoElement = getVideoElement();
  if (videoElement) {
    videoElement.currentTime = 0;
    videoElement.load();
  }
}

export async function playNextVideo(): Promise<void> {
  const videoElement = getVideoElement();
  const queue = useQueueStore.getState();
  const currentItem = getCurrentQueueItemFromState(queue);

  if (!videoElement || !currentItem) return;
  if (queue.items.length === 0) return;

  let nextIndex = queue.index + 1;
  if (nextIndex >= queue.items.length) {
    if (queue.repeatMode === "all") {
      nextIndex = 0;
    } else {
      videoElement.pause();
      usePlayerStore.getState().setPlayerState({ isPlaying: false });
      return;
    }
  }

  const item = queue.items[nextIndex];
  usePlayerStore.getState().setPlayerState({
    currentTime: 0,
    currentVideo: toFileUrl(item.path)
  });
  useQueueStore.getState().setQueueIndex(nextIndex);

  videoElement.currentTime = 0;
  videoElement.load();
}

export async function playPreviousVideo(): Promise<void> {
  const videoElement = getVideoElement();
  const queue = useQueueStore.getState();
  const currentItem = getCurrentQueueItemFromState(queue);

  if (!videoElement || !currentItem) return;
  if (queue.items.length === 0) return;

  let nextIndex = queue.index - 1;
  if (nextIndex < 0) {
    if (queue.repeatMode === "all") {
      nextIndex = queue.items.length - 1;
    } else {
      videoElement.pause();
      usePlayerStore.getState().setPlayerState({ isPlaying: false });
      return;
    }
  }

  const item = queue.items[nextIndex];
  usePlayerStore.getState().setPlayerState({
    currentTime: 0,
    currentVideo: toFileUrl(item.path)
  });
  useQueueStore.getState().setQueueIndex(nextIndex);

  videoElement.currentTime = 0;
  videoElement.load();
}

export async function togglePlayPause(): Promise<void> {
  const videoElement = getVideoElement();
  const queue = useQueueStore.getState();
  const currentItem = getCurrentQueueItemFromState(queue);

  if (!videoElement || !currentItem) return;

  if (usePlayerStore.getState().isPlaying) {
    videoElement.pause();
    usePlayerStore.getState().setPlayerState({ isPlaying: false });
    return;
  }

  try {
    await videoElement.play();
    usePlayerStore.getState().setPlayerState({ isPlaying: true });
  } catch {
    // Ignore autoplay failures.
  }
}

export async function setFullscreen(isFullscreen: boolean): Promise<void> {
  usePlayerStore.getState().setPlayerState({ isFullscreen });
  if (isFullscreen) {
    await enterFullscreen();
  } else {
    await exitFullscreen();
  }
}

export function setPlaybackCurrentTime(currentTime: number): void {
  usePlayerStore.getState().setCurrentTime(currentTime);
}
