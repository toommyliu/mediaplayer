import { cmdOrCtrl, optionOrAlt } from "$hooks/is-mac.svelte";

export type RecordedKeys = {
  display: string;
  keys: string[];
};

export class HotkeyRecorder {
  private isRecording = false;

  private currentCombo: Set<string> = new Set();

  private recordedCombo: string[] = [];

  private onRecordComplete?: (result: RecordedKeys) => void;

  private onRecordCancel?: () => void;

  private readonly keyDownRef: (ev: KeyboardEvent) => void;

  private readonly keyUpRef: (ev: KeyboardEvent) => void;

  public constructor() {
    this.keyDownRef = (ev) => this.handleKeyDown(ev);
    this.keyUpRef = (ev) => this.handleKeyUp(ev);
  }

  public startRecording(onComplete: (result: RecordedKeys) => void, onCancel?: () => void): void {
    if (this.isRecording) {
      this.stopRecording();
    }

    this.isRecording = true;
    this.currentCombo.clear();
    this.recordedCombo = [];
    this.onRecordComplete = onComplete;
    this.onRecordCancel = onCancel;

    window.addEventListener("keydown", this.keyDownRef, { capture: true });
    window.addEventListener("keyup", this.keyUpRef, { capture: true });
  }

  public stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    window.removeEventListener("keydown", this.keyDownRef, { capture: true });
    window.removeEventListener("keyup", this.keyUpRef, { capture: true });

    if (this.onRecordComplete) {
      const result = this.recordedCombo.length > 0 ? this.formatKeys() : { keys: [], display: "" };
      this.onRecordComplete(result);
    }

    this.cleanup();
  }

  public cancelRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    window.removeEventListener("keydown", this.keyDownRef, { capture: true });
    window.removeEventListener("keyup", this.keyUpRef, { capture: true });

    if (this.onRecordCancel) {
      this.onRecordCancel();
    }

    this.cleanup();
  }

  private cleanup(): void {
    this.currentCombo.clear();
    this.recordedCombo = [];
    this.onRecordComplete = undefined;
    this.onRecordCancel = undefined;
  }

  private handleKeyDown(ev: KeyboardEvent): void {
    if (!this.isRecording) return;

    ev.preventDefault();
    ev.stopPropagation();

    if (ev.key === "Escape") {
      // Complete recording with empty keys when ESC is pressed
      this.currentCombo.clear();
      this.recordedCombo = [];
      this.stopRecording();
      return;
    }

    // Only allow one combination per recording
    if (this.recordedCombo.length > 0) {
      // Already recorded, ignore further keydowns
      return;
    }

    // Add the key to our current combo set
    const key = this.normalizeKey(ev);
    if (key) {
      this.currentCombo.add(key);
    }
  }

  private handleKeyUp(ev: KeyboardEvent): void {
    if (!this.isRecording) return;

    ev.preventDefault();
    ev.stopPropagation();

    if (this.currentCombo.size > 0 && this.recordedCombo.length === 0) {
      // On first keyup, record the combo and stop
      this.recordedCombo = [
        Array.from(this.currentCombo)
          .sort((a, b) => a.localeCompare(b))
          .join("+")
      ];

      if (this.isRecording) {
        this.stopRecording();
      }
    }
  }

  private normalizeKey(ev: KeyboardEvent): string | null {
    const { key, metaKey, ctrlKey, altKey, shiftKey } = ev;
    const modifiers: string[] = [];

    if (metaKey) {
      modifiers.push("cmd");
    } else if (ctrlKey) {
      modifiers.push("ctrl");
    }

    if (altKey) {
      modifiers.push("alt");
    }

    if (shiftKey) {
      modifiers.push("shift");
    }

    let mainKey = "";
    if (key === " ") {
      mainKey = "space";
    } else if (key === "Enter") {
      mainKey = "enter";
    } else if (key === "Tab") {
      mainKey = "tab";
    } else if (key === "Backspace") {
      mainKey = "backspace";
    } else if (key === "Delete") {
      mainKey = "delete";
    } else if (key.startsWith("Arrow")) {
      mainKey = key.toLowerCase().replace("arrow", "");
    } else if (key.startsWith("F") && /^F\d+$/.test(key)) {
      mainKey = key.toLowerCase();
    } else if (key.length === 1) {
      mainKey = key.toLowerCase();
    } else if (key === "Meta" || key === "Control" || key === "Alt" || key === "Shift") {
      // Don't record bare modifier keys
      return null;
    } else {
      // Other special keys
      mainKey = key.toLowerCase();
    }

    if (!mainKey) return null;

    const parts = [...modifiers, mainKey];
    return parts.join("+");
  }

  private formatKeys(): RecordedKeys {
    if (this.recordedCombo.length === 1) {
      return {
        keys: this.recordedCombo,
        display: this.recordedCombo[0]
      };
    } else {
      return {
        keys: [],
        display: ""
      };
    }
  }
}

export const hotkeyRecorder = new HotkeyRecorder();

export function formatHotkeyDisplay(keys: string[] | string): string {
  if (typeof keys === "string") {
    return keys;
  }

  return keys
    .map((key) =>
      key
        .split("+")
        .map((key) => keyToChar(key.trim()))
        .join(" + ")
    )
    .join(", ");
}

function keyToChar(key: string): string {
  switch (key) {
    case "cmd":
    case "ctrl":
      return cmdOrCtrl;
    case "alt":
    case "option":
      return optionOrAlt;
    case "shift":
      return "Shift";
    case "space":
      return "Space";
    case "enter":
      return "Enter";
    case "tab":
      return "Tab";
    case "backspace":
      return "Backspace";
    case "delete":
      return "Delete";
    default:
      return key.toUpperCase();
  }
}
