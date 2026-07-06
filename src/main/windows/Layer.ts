import type { WindowEventMap, WindowEventName } from "./Service";
import type { WebContents } from "electron";
import { EventEmitter } from "node:events";
import { join } from "node:path";
import { is, platform } from "@electron-toolkit/utils";
import { Effect, Layer } from "effect";
import { BrowserWindow, shell } from "electron";
import icon from "../../../resources/icon.png?asset";
import { LoggerService } from "../logging/Service";
import { WindowService } from "./Service";

export const WindowLayer = Layer.effect(
  WindowService,
  Effect.gen(function* () {
    const logger = yield* LoggerService;

    const emitter = new EventEmitter();
    const windows = new Set<BrowserWindow>();
    let lastFocusedWindow: BrowserWindow | null = null;

    const isManagedWindow = (window: BrowserWindow | null | undefined): window is BrowserWindow =>
      Boolean(window && windows.has(window) && !window.isDestroyed());

    const getAllWindows = (): BrowserWindow[] => {
      const validWindows = Array.from(windows).filter((window) => !window.isDestroyed());

      for (const window of Array.from(windows)) {
        if (window.isDestroyed()) {
          windows.delete(window);
        }
      }

      return validWindows;
    };

    const getFocusedWindow = (): BrowserWindow | null => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      return isManagedWindow(focusedWindow) ? focusedWindow : null;
    };

    const getLastFocusedWindow = (): BrowserWindow | null => {
      if (isManagedWindow(lastFocusedWindow)) return lastFocusedWindow;

      lastFocusedWindow = null;
      return null;
    };

    const getPreferredWindow = (): BrowserWindow | null =>
      getFocusedWindow() ?? getLastFocusedWindow() ?? getAllWindows()[0] ?? null;

    const showWindow = (window: BrowserWindow): void => {
      if (window.isMinimized()) {
        window.restore();
      }
      window.show();
      window.focus();
    };

    const attachWindowEventListeners = (window: BrowserWindow): void => {
      window.on("ready-to-show", () => emitter.emit("ready-to-show", window));
      window.on("show", () => emitter.emit("show", window));
      window.on("close", (event) => {
        emitter.emit("close", event, window);
      });
      window.on("closed", () => {
        windows.delete(window);
        if (lastFocusedWindow === window) {
          lastFocusedWindow = getAllWindows()[0] ?? null;
        }
        emitter.emit("closed", window);
      });
      window.on("focus", () => {
        lastFocusedWindow = window;
        emitter.emit("focus", window);
      });
      window.on("blur", () => emitter.emit("blur", window));
      window.on("enter-full-screen", () => emitter.emit("enter-full-screen", window));
      window.on("leave-full-screen", () => emitter.emit("leave-full-screen", window));
    };

    const createWindow = (): BrowserWindow => {
      const window = new BrowserWindow({
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
      });

      windows.add(window);
      attachWindowEventListeners(window);

      window.on("ready-to-show", () => {
        window.show();
        window.maximize();

        if (is.dev) {
          window.webContents.openDevTools({ mode: "right" });
        }
      });

      window.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
      });

      if (is.dev && process.env.ELECTRON_RENDERER_URL) {
        void window.loadURL(process.env.ELECTRON_RENDERER_URL);
      } else {
        void window.loadFile(join(__dirname, "../renderer/index.html"));
      }

      return window;
    };

    const getByWebContents = (webContents: WebContents): BrowserWindow | null => {
      const window = BrowserWindow.fromWebContents(webContents);
      return isManagedWindow(window) ? window : null;
    };

    const destroyAllWindows = (): void => {
      const currentWindows = getAllWindows();
      for (const window of currentWindows) {
        try {
          if (!window.isDestroyed()) window.destroy();
        } catch (error) {
          logger.error("Error destroying window", error);
        }
      }

      windows.clear();
      lastFocusedWindow = null;
    };

    yield* Effect.addFinalizer(() => Effect.sync(destroyAllWindows));

    const service = {
      create: Effect.sync(createWindow),
      destroyAll: Effect.sync(destroyAllWindows),
      getAll: Effect.sync(getAllWindows),
      getByWebContents: (webContents: WebContents) =>
        Effect.sync(() => getByWebContents(webContents)),
      getFocusedWindow: Effect.sync(getFocusedWindow),
      getLastFocusedWindow: Effect.sync(getLastFocusedWindow),
      getOrCreateFocusedWindow: Effect.sync(() => {
        const window = getPreferredWindow();
        if (window) {
          if (platform.isMacOS && !window.isVisible()) {
            showWindow(window);
          }
          return window;
        }

        return createWindow();
      }),
      hasWindows: Effect.sync(() => getAllWindows().length > 0),
      setFullScreen: (window: BrowserWindow | null, flag: boolean) =>
        Effect.sync(() => {
          if (!isManagedWindow(window)) return;
          window.setFullScreen(flag);
        }),
      show: (window: BrowserWindow | null) =>
        Effect.sync(() => {
          if (!isManagedWindow(window)) return;
          showWindow(window);
        }),
      showLastFocused: Effect.sync(() => {
        const window = getPreferredWindow();
        if (!window) return;
        showWindow(window);
      }),
      on: <K extends WindowEventName>(event: K, listener: (...args: WindowEventMap[K]) => void) =>
        Effect.sync(() => {
          emitter.on(event, listener as (...args: unknown[]) => void);
          return () => {
            emitter.off(event, listener as (...args: unknown[]) => void);
          };
        }),
      once: <K extends WindowEventName>(event: K, listener: (...args: WindowEventMap[K]) => void) =>
        Effect.sync(() => {
          emitter.once(event, listener as (...args: unknown[]) => void);
          return () => {
            emitter.off(event, listener as (...args: unknown[]) => void);
          };
        }),
    } satisfies WindowService["Service"];

    return service;
  }),
);
