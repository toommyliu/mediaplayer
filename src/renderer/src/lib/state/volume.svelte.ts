import { PersistedState } from "runed";
import { playerState } from "./player.svelte";

class VolumeState {
  private _value = new PersistedState<number>("volume", 1);

  private _isMuted = $state(false);

  public get value(): number {
    return this._value.current;
  }

  public set value(newValue: number) {
    this._value.current = Math.max(0, Math.min(1, newValue));

    if (this.value === 0) {
      this.isMuted = true;
    }

    if (playerState.videoElement) {
      playerState.videoElement.volume = this._value.current;
      playerState.videoElement.muted = this._isMuted;
    }
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public set isMuted(newValue: boolean) {
    this._isMuted = newValue;
    if (playerState.videoElement) {
      playerState.videoElement.muted = this._isMuted;
      playerState.videoElement.volume = this._isMuted ? 0 : this._value.current;
    }
  }
}

export const volume = new VolumeState();
