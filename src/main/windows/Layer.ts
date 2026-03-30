import { EventEmitter } from "node:events";
import { is, platform } from "@electron-toolkit/utils";
import { BrowserWindow, shell } from "electron";
import { Effect, Layer } from "effect";
import { join } from "node:path";
import icon from "../../../resources/icon.png?asset";
import { LoggerService } from "../logging/Service";
import { WindowService, type WindowEventName } from "./Service";

export const WindowLayer = Layer.effect(
  WindowService,
  Effect.gen(function* () {
    const logger = yield* LoggerService;

    const emitter = new EventEmitter();
    let mainWindow: BrowserWindow | null = null;

    const attachWindowEventListeners = (window: BrowserWindow): void => {
      window.on("ready-to-show", () => emitter.emit("ready-to-show", window));
      window.on("show", () => emitter.emit("show", window));
      window.on("close", (event) => {
        if (platform.isMacOS) {
          event.preventDefault();
          window.hide();
          return;
        }

        emitter.emit("close", event, window);
      });
      window.on("closed", () => emitter.emit("closed"));
      window.on("focus", () => emitter.emit("focus"));
      window.on("blur", () => emitter.emit("blur"));
    };

    const detachWindowEventListeners = (window: BrowserWindow): void => {
      window.removeAllListeners("ready-to-show");
      window.removeAllListeners("show");
      window.removeAllListeners("close");
      window.removeAllListeners("closed");
      window.removeAllListeners("focus");
      window.removeAllListeners("blur");
    };

    const createMainWindow = (): BrowserWindow => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        return mainWindow;
      }

      const window = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        ...(platform.isLinux ? { icon } : {}),
        webPreferences: {
          preload: join(__dirname, "../preload/index.js"),
          sandbox: false,
          webSecurity: false,
          contextIsolation: true
        }
      });

      mainWindow = window;
      attachWindowEventListeners(window);

      window.on("ready-to-show", () => {
        window.show();
        window.maximize();

        if (is.dev) {
          window.webContents.openDevTools({ mode: "right" });
        }
      });

      window.on("closed", () => {
        detachWindowEventListeners(window);
        mainWindow = null;
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

    const destroyMainWindow = (): void => {
      if (!mainWindow) return;
      try {
        detachWindowEventListeners(mainWindow);
        mainWindow.removeAllListeners("close");
        if (!mainWindow.isDestroyed()) mainWindow.destroy();
      } catch (error) {
        logger.error("Error destroying main window", error);
      } finally {
        mainWindow = null;
      }
    };

    yield* Effect.addFinalizer(() => Effect.sync(destroyMainWindow));

    const service = {
      create: Effect.sync(createMainWindow),
      getMainWindow: Effect.sync(() => mainWindow),
      getOrCreateMainWindow: Effect.sync(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (platform.isMacOS && !mainWindow.isVisible()) {
            mainWindow.show();
          }
          return mainWindow;
        }

        return createMainWindow();
      }),
      setFullScreen: (flag: boolean) =>
        Effect.sync(() => {
          if (!mainWindow || mainWindow.isDestroyed()) return;
          mainWindow.setFullScreen(flag);
        }),
      show: Effect.sync(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.show();
      }),
      hide: Effect.sync(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.hide();
      }),
      destroy: Effect.sync(destroyMainWindow),
      isCreated: Effect.sync(() => !!mainWindow && !mainWindow.isDestroyed()),
      on: (event: WindowEventName, listener: (...args: any[]) => void) =>
        Effect.sync(() => {
          emitter.on(event, listener);
          return () => {
            emitter.off(event, listener);
          };
        }),
      once: (event: WindowEventName, listener: (...args: any[]) => void) =>
        Effect.sync(() => {
          emitter.once(event, listener);
          return () => {
            emitter.off(event, listener);
          };
        })
    } satisfies WindowService["Service"];

    return service;
  })
);
