import { useVolumeStore } from "@/stores/volume";

export function setMutedWithMediaSync(isMuted: boolean): void {
  useVolumeStore.getState().setMuted(isMuted);
}

export function setVolumeWithMediaSync(value: number): void {
  useVolumeStore.getState().setVolume(value);
}

export function increaseVolumeWithMediaSync(): void {
  useVolumeStore.getState().increaseVolume();
}

export function decreaseVolumeWithMediaSync(): void {
  useVolumeStore.getState().decreaseVolume();
}
