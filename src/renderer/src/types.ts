export enum SidebarTab {
  FileBrowser = "file-browser",
  Queue = "queue",
  Settings = "settings"
}

export interface HotkeyAction {
  id: string;
  description: string;
  keys: string[];
  handler: (event: KeyboardEvent) => void;
  context?: "global" | "video" | "sidebar" | "file-browser";
  enabled?: boolean;
}

export interface HotkeyCategory {
  name: string;
  actions: HotkeyAction[];
}

export interface HotkeyConfigExport {
  seekTime: number;
  volumeStep: number;
  categories: {
    name: string;
    actions: {
      id: string;
      description: string;
      keys: string[];
      context?: string;
      enabled?: boolean;
    }[];
  }[];
}
