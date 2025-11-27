import { PersistedState } from "runed";

export type NotificationPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

class NotificationSettings {
  private _upNextEnabled = new PersistedState<boolean>("notification:upNextEnabled", true);
  private _upNextPosition = new PersistedState<NotificationPosition>("notification:upNextPosition", "top-right");
  private _videoInfoEnabled = new PersistedState<boolean>("notification:videoInfoEnabled", true);

  public get upNextEnabled(): boolean {
    return this._upNextEnabled.current;
  }

  public set upNextEnabled(value: boolean) {
    this._upNextEnabled.current = value;
  }

  public get upNextPosition(): NotificationPosition {
    return this._upNextPosition.current;
  }

  public set upNextPosition(value: NotificationPosition) {
    this._upNextPosition.current = value;
  }

  public get videoInfoEnabled(): boolean {
    return this._videoInfoEnabled.current;
  }

  public set videoInfoEnabled(value: boolean) {
    this._videoInfoEnabled.current = value;
  }
}

export const notificationSettings = new NotificationSettings();
