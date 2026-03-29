import { syncVolumeToVideoElement } from "@/lib/controllers/media-runtime";
import { useVolumeStore } from "@stores/volume";

export function setMutedWithMediaSync(isMuted: boolean): void {
  useVolumeStore.getState().setMuted(isMuted);
  syncVolumeToVideoElement();
}

export function setVolumeWithMediaSync(value: number): void {
  useVolumeStore.getState().setVolume(value);
  syncVolumeToVideoElement();
}

export function increaseVolumeWithMediaSync(): void {
  useVolumeStore.getState().increaseVolume();
  syncVolumeToVideoElement();
}

export function decreaseVolumeWithMediaSync(): void {
  useVolumeStore.getState().decreaseVolume();
  syncVolumeToVideoElement();
}
