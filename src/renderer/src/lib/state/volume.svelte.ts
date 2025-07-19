import { playerState } from "./player.svelte";

class VolumeState {
  private _value = $state(1);

  private _isMuted = $state(false);

  public get value(): number {
    return this._value;
  }

  public set value(newValue: number) {
    this._value = Math.max(0, Math.min(1, newValue));
    if (playerState.videoElement) {
      playerState.videoElement.volume = this._value;
    }
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public set isMuted(newValue: boolean) {
    this._isMuted = newValue;
    if (playerState.videoElement) {
      playerState.videoElement.muted = this._isMuted;
      playerState.videoElement.volume = this._isMuted ? 0 : this._value;
    }
  }
}

export const volume = new VolumeState();
