import type { WebContents } from "electron";
import { join } from "node:path";
import { is, platform } from "@electron-toolkit/utils";
import { Context, Effect, Layer, PubSub, Stream } from "effect";
import { BrowserWindow, shell } from "electron";
import icon from "../../../resources/icon.png?asset";
import { WindowError } from "../errors";
import { ElectronCallbacks } from "../runtime/ElectronCallbacks";

export type WindowEvent =
  | { readonly _tag: "Blur"; readonly window: BrowserWindow }
  | { readonly _tag: "Closed"; readonly window: BrowserWindow }
  | { readonly _tag: "EnterFullScreen"; readonly window: BrowserWindow }
  | { readonly _tag: "Focus"; readonly window: BrowserWindow }
  | { readonly _tag: "LeaveFullScreen"; readonly window: BrowserWindow }
  | { readonly _tag: "ReadyToShow"; readonly window: BrowserWindow };

export interface WindowManagerShape {
  readonly create: Effect.Effect<BrowserWindow, WindowError>;
  readonly destroyAll: Effect.Effect<void>;
  readonly events: Stream.Stream<WindowEvent>;
  readonly getAll: Effect.Effect<ReadonlyArray<BrowserWindow>>;
  readonly getByWebContents: (webContents: WebContents) => Effect.Effect<BrowserWindow | null>;
  readonly getFocused: Effect.Effect<BrowserWindow | null>;
  readonly getLastFocused: Effect.Effect<BrowserWindow | null>;
  readonly getOrCreateFocused: Effect.Effect<BrowserWindow, WindowError>;
  readonly hasWindows: Effect.Effect<boolean>;
  readonly setFullScreen: (window: BrowserWindow | null, enabled: boolean) => Effect.Effect<void>;
  readonly showLastFocused: Effect.Effect<void>;
}

export class WindowManager extends Context.Service<WindowManager, WindowManagerShape>()(
  "mediaplayer/main/electron/WindowManager",
) {
  static readonly layer = Layer.effect(
    WindowManager,
    Effect.gen(function* () {
      const callbacks = yield* ElectronCallbacks;
      const events = yield* PubSub.unbounded<WindowEvent>();
      const windows = new Set<BrowserWindow>();
      let lastFocused: BrowserWindow | null = null;

      const isManaged = (window: BrowserWindow | null | undefined): window is BrowserWindow =>
        Boolean(window && windows.has(window) && !window.isDestroyed());

      const allWindows = (): ReadonlyArray<BrowserWindow> => {
        for (const window of windows) {
          if (window.isDestroyed()) {
            windows.delete(window);
          }
        }
        return Array.from(windows);
      };

      const focusedWindow = (): BrowserWindow | null => {
        const focused = BrowserWindow.getFocusedWindow();
        return isManaged(focused) ? focused : null;
      };

      const lastFocusedWindow = (): BrowserWindow | null => {
        if (isManaged(lastFocused)) return lastFocused;
        lastFocused = null;
        return null;
      };

      const preferredWindow = (): BrowserWindow | null =>
        focusedWindow() ?? lastFocusedWindow() ?? allWindows()[0] ?? null;

      const showWindow = (window: BrowserWindow): void => {
        if (window.isMinimized()) window.restore();
        window.show();
        window.focus();
      };

      const publish = (event: WindowEvent): void => {
        PubSub.publishUnsafe(events, event);
      };

      const create = Effect.fn("WindowManager.create")(function* () {
        const window = yield* Effect.try({
          try: () =>
            new BrowserWindow({
              width: 900,
              height: 670,
              show: false,
              autoHideMenuBar: true,
              ...(platform.isLinux ? { icon } : {}),
              webPreferences: {
                preload: join(__dirname, "../preload/index.mjs"),
                sandbox: false,
                webSecurity: false,
                contextIsolation: true,
              },
            }),
          catch: (cause) => new WindowError({ cause, operation: "create" }),
        });

        windows.add(window);

        window.on("ready-to-show", () => {
          publish({ _tag: "ReadyToShow", window });
          callbacks.run(
            "window.ready-to-show",
            Effect.try({
              try: () => {
                window.show();
                if (is.dev) window.webContents.openDevTools({ mode: "right" });
              },
              catch: (cause) => new WindowError({ cause, operation: "ready-to-show" }),
            }).pipe(Effect.asVoid),
          );
        });
        window.on("focus", () => {
          lastFocused = window;
          publish({ _tag: "Focus", window });
        });
        window.on("blur", () => publish({ _tag: "Blur", window }));
        window.on("enter-full-screen", () => publish({ _tag: "EnterFullScreen", window }));
        window.on("leave-full-screen", () => publish({ _tag: "LeaveFullScreen", window }));
        window.on("closed", () => {
          windows.delete(window);
          if (lastFocused === window) lastFocused = allWindows()[0] ?? null;
          publish({ _tag: "Closed", window });
        });

        window.webContents.setWindowOpenHandler(({ url }) => {
          callbacks.run(
            "window.open-external",
            Effect.tryPromise({
              try: () => shell.openExternal(url),
              catch: (cause) => new WindowError({ cause, operation: "open-external" }),
            }).pipe(Effect.asVoid),
          );
          return { action: "deny" };
        });

        const load =
          is.dev && process.env.ELECTRON_RENDERER_URL
            ? window.loadURL(process.env.ELECTRON_RENDERER_URL)
            : window.loadFile(join(__dirname, "../renderer/index.html"));
        callbacks.run(
          "window.load-renderer",
          Effect.tryPromise({
            try: () => load,
            catch: (cause) => new WindowError({ cause, operation: "load-renderer" }),
          }).pipe(Effect.asVoid),
        );

        return window;
      });

      const destroyAll = Effect.fn("WindowManager.destroyAll")(function* () {
        for (const window of allWindows()) {
          yield* Effect.try({
            try: () => {
              if (!window.isDestroyed()) window.destroy();
            },
            catch: (cause) => new WindowError({ cause, operation: "destroy" }),
          }).pipe(Effect.catch((error) => Effect.logError("Failed to destroy window", error)));
        }
        windows.clear();
        lastFocused = null;
      });

      yield* Effect.addFinalizer(() =>
        destroyAll().pipe(
          Effect.andThen(PubSub.shutdown(events)),
          Effect.annotateLogs({ service: "WindowManager" }),
        ),
      );

      return WindowManager.of({
        create: create(),
        destroyAll: destroyAll(),
        events: Stream.fromPubSub(events),
        getAll: Effect.sync(allWindows),
        getByWebContents: (webContents) =>
          Effect.sync(() => {
            const window = BrowserWindow.fromWebContents(webContents);
            return isManaged(window) ? window : null;
          }),
        getFocused: Effect.sync(focusedWindow),
        getLastFocused: Effect.sync(lastFocusedWindow),
        getOrCreateFocused: Effect.suspend(() => {
          const window = preferredWindow();
          if (!window) return create();
          if (platform.isMacOS && !window.isVisible()) showWindow(window);
          return Effect.succeed(window);
        }),
        hasWindows: Effect.sync(() => allWindows().length > 0),
        setFullScreen: (window, enabled) =>
          Effect.sync(() => {
            if (isManaged(window)) window.setFullScreen(enabled);
          }),
        showLastFocused: Effect.sync(() => {
          const window = preferredWindow();
          if (window) showWindow(window);
        }),
      });
    }),
  );
}
