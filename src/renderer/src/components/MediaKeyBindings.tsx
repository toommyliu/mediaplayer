import { useEffect } from "react";
import { runHotkeyAction } from "@/actions/hotkeys";
import {
  onMediaNextTrack,
  onMediaPlayPause,
  onMediaPreviousTrack,
} from "@/lib/ipc";

export function MediaKeyBindings() {
  useEffect(() => {
    const disposers = [
      onMediaPreviousTrack(() => {
        void runHotkeyAction("previousTrack");
      }),
      onMediaPlayPause(() => {
        void runHotkeyAction("playPause");
      }),
      onMediaNextTrack(() => {
        void runHotkeyAction("nextTrack");
      }),
    ];

    return () => {
      for (const dispose of disposers) {
        dispose();
      }
    };
  }, []);

  return null;
}
