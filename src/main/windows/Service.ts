import type { Effect } from "effect";
import type { BrowserWindow } from "electron";
import { ServiceMap } from "effect";

export type WindowEventName
  = | "ready-to-show"
    | "show"
    | "close"
    | "closed"
    | "focus"
    | "blur"
    | "enter-full-screen"
    | "leave-full-screen";

export interface WindowServiceShape {
  create: Effect.Effect<BrowserWindow>;
  getMainWindow: Effect.Effect<BrowserWindow | null>;
  getOrCreateMainWindow: Effect.Effect<BrowserWindow>;
  setFullScreen: (flag: boolean) => Effect.Effect<void>;
  show: Effect.Effect<void>;
  hide: Effect.Effect<void>;
  destroy: Effect.Effect<void>;
  isCreated: Effect.Effect<boolean>;
  on: (
    event: WindowEventName,
    listener: (...args: any[]) => void,
  ) => Effect.Effect<() => void>;
  once: (
    event: WindowEventName,
    listener: (...args: any[]) => void,
  ) => Effect.Effect<() => void>;
}

export class WindowService extends ServiceMap.Service<
  WindowService,
  WindowServiceShape
>()("main/windows/WindowService") {}
