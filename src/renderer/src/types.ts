export enum SidebarTab {
  FileBrowser = "file-browser",
  Queue = "queue"
}

export enum RepeatMode {
  All = "all",
  Off = "off",
  One = "one"
}

export interface HotkeyAction {
  id: string;
  description: string;
  keys: string[];
  handler: (event: KeyboardEvent) => void;
  context?: "global" | "video" | "sidebar" | "file-browser";
  enabled?: boolean;
}
