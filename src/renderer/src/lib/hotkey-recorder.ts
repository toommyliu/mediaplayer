import { getPlatformState } from "@/lib/state/platform";

export type RecordedKeys = {
  display: string;
  keys: string[];
};

export class HotkeyRecorder {
  private currentCombo = new Set<string>();

  private isRecording = false;

  private onRecordCancel?: () => void;

  private onRecordComplete?: (result: RecordedKeys) => void;

  private recordedCombo: string[] = [];

  private readonly keyDownRef: (event: KeyboardEvent) => void;

  private readonly keyUpRef: (event: KeyboardEvent) => void;

  public constructor() {
    this.keyDownRef = (event) => this.handleKeyDown(event);
    this.keyUpRef = (event) => this.handleKeyUp(event);
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
      const result =
        this.recordedCombo.length > 0 ? this.formatKeys() : { display: "", keys: [] };
      this.onRecordComplete(result);
    }

    this.cleanup();
  }

  public cancelRecording(): void {
    if (!this.isRecording) return;
    this.isRecording = false;

    window.removeEventListener("keydown", this.keyDownRef, { capture: true });
    window.removeEventListener("keyup", this.keyUpRef, { capture: true });

    this.onRecordCancel?.();
    this.cleanup();
  }

  private cleanup(): void {
    this.currentCombo.clear();
    this.recordedCombo = [];
    this.onRecordCancel = undefined;
    this.onRecordComplete = undefined;
  }

  private formatKeys(): RecordedKeys {
    return {
      display: this.recordedCombo[0] ?? "",
      keys: this.recordedCombo.length === 1 ? this.recordedCombo : []
    };
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isRecording) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      this.currentCombo.clear();
      this.recordedCombo = [];
      this.stopRecording();
      return;
    }

    if (this.recordedCombo.length > 0) return;

    const normalized = normalizeKey(event);
    if (normalized) {
      this.currentCombo.add(normalized);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isRecording) return;

    event.preventDefault();
    event.stopPropagation();

    if (this.currentCombo.size > 0 && this.recordedCombo.length === 0) {
      this.recordedCombo = [
        Array.from(this.currentCombo)
          .sort((left, right) => left.localeCompare(right))
          .join("+")
      ];
      this.stopRecording();
    }
  }
}

export const hotkeyRecorder = new HotkeyRecorder();

function normalizeKey(event: KeyboardEvent): string | null {
  const modifiers: string[] = [];

  if (event.metaKey) {
    modifiers.push("cmd");
  } else if (event.ctrlKey) {
    modifiers.push("ctrl");
  }

  if (event.altKey) modifiers.push("alt");
  if (event.shiftKey) modifiers.push("shift");

  let mainKey = "";
  if (event.key === " ") {
    mainKey = "space";
  } else if (event.key === "Enter") {
    mainKey = "enter";
  } else if (event.key === "Tab") {
    mainKey = "tab";
  } else if (event.key === "Backspace") {
    mainKey = "backspace";
  } else if (event.key === "Delete") {
    mainKey = "delete";
  } else if (event.key.startsWith("Arrow")) {
    mainKey = event.key.toLowerCase().replace("arrow", "");
  } else if (/^F\d+$/.test(event.key)) {
    mainKey = event.key.toLowerCase();
  } else if (event.key.length === 1) {
    mainKey = event.key.toLowerCase();
  } else if (["Meta", "Control", "Alt", "Shift"].includes(event.key)) {
    return null;
  } else {
    mainKey = event.key.toLowerCase();
  }

  if (!mainKey) return null;
  return [...modifiers, mainKey].join("+");
}

export function formatHotkeyDisplay(keys: string[] | string): string {
  const keyArray = typeof keys === "string" ? [keys] : keys;

  return keyArray
    .map((key) =>
      key
        .split("+")
        .map((part) => keyToDisplay(part.trim()))
        .join(" + ")
    )
    .join(", ");
}

function keyToDisplay(key: string): string {
  const isMac = getPlatformState().isMac;

  switch (key) {
    case "cmd":
    case "command":
      return isMac ? "⌘" : "Win";
    case "ctrl":
      return isMac ? "⌃" : "Ctrl";
    case "alt":
    case "option":
      return isMac ? "⌥" : "Alt";
    case "shift":
      return isMac ? "⇧" : "Shift";
    case "space":
      return "Space";
    case "enter":
    case "return":
      return isMac ? "↵" : "Enter";
    case "tab":
      return isMac ? "⇥" : "Tab";
    case "backspace":
      return isMac ? "⌫" : "Backspace";
    case "delete":
      return isMac ? "⌦" : "Del";
    case "escape":
    case "esc":
      return isMac ? "⎋" : "Esc";
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "left":
      return "←";
    case "right":
      return "→";
    default:
      return /^f\d+$/i.test(key) ? key.toUpperCase() : key.toUpperCase();
  }
}
