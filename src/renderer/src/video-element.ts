import { bindAudioOutput } from "@/audio-output";
import { useVolumeStore } from "@/stores/volume";

let videoElement: HTMLVideoElement | null = null;

function sync(): void {
  if (!videoElement) return;
  const { isMuted, value } = useVolumeStore.getState();
  videoElement.volume = isMuted ? 0 : value;
  videoElement.muted = isMuted;
}

useVolumeStore.subscribe(sync);

export function bindVideoElement(element: HTMLVideoElement | null): void {
  videoElement = element;
  bindAudioOutput(element);
  sync();
}

export function getVideoElement(): HTMLVideoElement | null {
  return videoElement;
}
