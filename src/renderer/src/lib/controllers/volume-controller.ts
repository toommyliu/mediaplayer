import {
  decreaseVolume,
  increaseVolume,
  setMuted,
  setVolume
} from "@/lib/state/volume";
import { syncVolumeToVideoElement } from "@/lib/controllers/media-runtime";

export function setMutedWithMediaSync(isMuted: boolean): void {
  setMuted(isMuted);
  syncVolumeToVideoElement();
}

export function setVolumeWithMediaSync(value: number): void {
  setVolume(value);
  syncVolumeToVideoElement();
}

export function increaseVolumeWithMediaSync(): void {
  increaseVolume();
  syncVolumeToVideoElement();
}

export function decreaseVolumeWithMediaSync(): void {
  decreaseVolume();
  syncVolumeToVideoElement();
}
