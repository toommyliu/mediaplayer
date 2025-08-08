import { PersistedState } from "runed";
import { playerState } from "./player.svelte";

class VolumeState {
  private _value = new PersistedState<number>("volume", 1);

  private _isMuted = $state(false);

  public get value(): number {
    return this._value.current;
  }

  public set value(newValue: number) {
    // Volume can be a double between 0 and 1
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

      // If muted, set volume to 0, otherwise set to current volume
      playerState.videoElement.volume = this._isMuted ? 0 : this._value.current;
    }
  }

  public decreaseTick() {
    if (this.value > 0) this.value = Math.max(0, this.value - 0.05);
    if (this.value === 0) this.isMuted = true;
  }

  public increaseTick() {
    if (this.value < 1) this.value = Math.min(1, this.value + 0.05);
    if (this.value > 0) this.isMuted = false;
  }
}

export const volume = new VolumeState();
