import { useVolumeStore } from "@stores/volume";

let videoElement: HTMLVideoElement | null = null;

export function bindVideoElement(element: HTMLVideoElement | null): void {
  videoElement = element;
  syncVolumeToVideoElement();
}

export function getVideoElement(): HTMLVideoElement | null {
  return videoElement;
}

export function syncVolumeToVideoElement(): void {
  if (!videoElement) return;

  const volume = useVolumeStore.getState();
  videoElement.volume = volume.isMuted ? 0 : volume.value;
  videoElement.muted = volume.isMuted;
}
