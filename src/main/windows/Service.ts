import type { Effect } from "effect";
import type { BrowserWindow, WebContents } from "electron";
import { ServiceMap } from "effect";

export interface WindowEventMap {
  "ready-to-show": [window: BrowserWindow];
  show: [window: BrowserWindow];
  close: [event: Electron.Event, window: BrowserWindow];
  closed: [window: BrowserWindow];
  focus: [window: BrowserWindow];
  blur: [window: BrowserWindow];
  "enter-full-screen": [window: BrowserWindow];
  "leave-full-screen": [window: BrowserWindow];
}

export type WindowEventName = keyof WindowEventMap;

export interface WindowServiceShape {
  create: Effect.Effect<BrowserWindow>;
  destroyAll: Effect.Effect<void>;
  getAll: Effect.Effect<BrowserWindow[]>;
  getByWebContents: (webContents: WebContents) => Effect.Effect<BrowserWindow | null>;
  getFocusedWindow: Effect.Effect<BrowserWindow | null>;
  getLastFocusedWindow: Effect.Effect<BrowserWindow | null>;
  getOrCreateFocusedWindow: Effect.Effect<BrowserWindow>;
  hasWindows: Effect.Effect<boolean>;
  setFullScreen: (window: BrowserWindow | null, flag: boolean) => Effect.Effect<void>;
  show: (window: BrowserWindow | null) => Effect.Effect<void>;
  showLastFocused: Effect.Effect<void>;
  on: <K extends WindowEventName>(
    event: K,
    listener: (...args: WindowEventMap[K]) => void,
  ) => Effect.Effect<() => void>;
  once: <K extends WindowEventName>(
    event: K,
    listener: (...args: WindowEventMap[K]) => void,
  ) => Effect.Effect<() => void>;
}

export class WindowService extends ServiceMap.Service<WindowService, WindowServiceShape>()(
  "main/windows/WindowService",
) {}
