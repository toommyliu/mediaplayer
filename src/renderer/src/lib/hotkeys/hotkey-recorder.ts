// Hotkey recording utility for capturing key combinations

export type RecordedKeys = {
  display: string;
  keys: string[];
};

export class HotkeyRecorder {
  private isRecording = false;

  private pressedKeys = new Set<string>();

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
    this.pressedKeys.clear();
    this.onRecordComplete = onComplete;
    this.onRecordCancel = onCancel;

    document.addEventListener("keydown", this.keyDownRef);
    document.addEventListener("keyup", this.keyUpRef);
  }

  public stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    document.removeEventListener("keydown", this.keyDownRef);
    document.removeEventListener("keyup", this.keyUpRef);

    if (this.pressedKeys.size > 0 && this.onRecordComplete) {
      const result = this.formatKeys();
      this.onRecordComplete(result);
    }

    this.cleanup();
  }

  public cancelRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    document.removeEventListener("keydown", this.keyDownRef);
    document.removeEventListener("keyup", this.keyUpRef);

    if (this.onRecordCancel) {
      this.onRecordCancel();
    }

    this.cleanup();
  }

  private cleanup(): void {
    this.pressedKeys.clear();
    this.onRecordComplete = undefined;
    this.onRecordCancel = undefined;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isRecording) return;

    event.preventDefault();
    event.stopPropagation();

    // Handle special case for Escape to cancel
    if (event.key === "Escape") {
      this.cancelRecording();
      return;
    }

    // Add the key to our pressed keys set
    const key = this.normalizeKey(event);
    if (key) {
      this.pressedKeys.add(key);
    }
  }

  private handleKeyUp(ev: KeyboardEvent): void {
    if (!this.isRecording) return;

    ev.preventDefault();
    ev.stopPropagation();

    if (this.pressedKeys.size > 0) {
      // eslint-disable-next-line no-restricted-globals
      setTimeout(() => {
        if (this.isRecording && this.pressedKeys.size > 0) {
          this.stopRecording();
        }
      }, 100);
    }
  }

  private normalizeKey(ev: KeyboardEvent): string | null {
    const { key, metaKey, ctrlKey, altKey, shiftKey } = ev;
    const modifiers: string[] = [];

    // Platform-specific modifier
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
      // Regular character key
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
    const keysArray = Array.from(this.pressedKeys);

    // If we have multiple keys, it might be a chord
    if (keysArray.length === 1) {
      return {
        keys: keysArray,
        display: keysArray[0]
      };
    } else {
      // For multiple keys, join them as alternatives
      return {
        keys: keysArray,
        display: keysArray.join(" or ")
      };
    }
  }
}

// Global recorder instance
export const hotkeyRecorder = new HotkeyRecorder();

// Utility function to format key combinations for display
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
      return "⌘";
    case "ctrl":
      return "Ctrl";
    case "alt":
      return "Alt";
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
