// Hotkey recording utility for capturing key combinations

export interface RecordedKeys {
  keys: string[];
  display: string;
}

export class HotkeyRecorder {
  private isRecording = false;
  private pressedKeys = new Set<string>();
  private onRecordComplete?: (result: RecordedKeys) => void;
  private onRecordCancel?: () => void;
  private recordingTimeout?: number;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  startRecording(onComplete: (result: RecordedKeys) => void, onCancel?: () => void): void {
    if (this.isRecording) {
      this.stopRecording();
    }

    this.isRecording = true;
    this.pressedKeys.clear();
    this.onRecordComplete = onComplete;
    this.onRecordCancel = onCancel;

    // Add event listeners
    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("keyup", this.handleKeyUp, true);

    // Auto-stop recording after 10 seconds
    this.recordingTimeout = window.setTimeout(() => {
      this.cancelRecording();
    }, 10000);
  }

  stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    document.removeEventListener("keydown", this.handleKeyDown, true);
    document.removeEventListener("keyup", this.handleKeyUp, true);

    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = undefined;
    }

    if (this.pressedKeys.size > 0 && this.onRecordComplete) {
      const result = this.formatKeys();
      this.onRecordComplete(result);
    }

    this.cleanup();
  }

  cancelRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    document.removeEventListener("keydown", this.handleKeyDown, true);
    document.removeEventListener("keyup", this.handleKeyUp, true);

    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = undefined;
    }

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

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isRecording) return;

    event.preventDefault();
    event.stopPropagation();

    // If we have keys and this is the last key released, complete the recording
    if (this.pressedKeys.size > 0) {
      // Small delay to allow for chord combinations
      setTimeout(() => {
        if (this.isRecording && this.pressedKeys.size > 0) {
          this.stopRecording();
        }
      }, 100);
    }
  }

  private normalizeKey(event: KeyboardEvent): string | null {
    const { key, metaKey, ctrlKey, altKey, shiftKey } = event;

    // Handle modifier keys
    const modifiers: string[] = [];

    // Use cmd on Mac, ctrl on other platforms
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

    // Handle the main key
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

    // Combine modifiers and main key
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

  get recording(): boolean {
    return this.isRecording;
  }

  get currentKeys(): string[] {
    return Array.from(this.pressedKeys);
  }
}

// Global recorder instance
export const hotkeyRecorder = new HotkeyRecorder();

// Utility function to format key combinations for display
export function formatHotkeyDisplay(keys: string | string[]): string {
  if (typeof keys === "string") {
    return keys;
  }

  return keys
    .map((key) => {
      // Capitalize and format for better display
      return key
        .split("+")
        .map((part) => {
          switch (part) {
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
            case "left":
              return "←";
            case "right":
              return "→";
            case "up":
              return "↑";
            case "down":
              return "↓";
            default:
              return part.toUpperCase();
          }
        })
        .join(" + ");
    })
    .join(", ");
}
