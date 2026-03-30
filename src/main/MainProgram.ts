import { electronApp, optimizer, platform } from "@electron-toolkit/utils";
import { Effect } from "effect";
import { app, BrowserWindow } from "electron";
import { LoggerService } from "./logging/Service";
import { WindowService } from "./windows/Service";

export const MainProgram = Effect.gen(function* () {
  const logger = yield* LoggerService;
  const windows = yield* WindowService;

  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

  yield* Effect.tryPromise({
    try: async () => {
      await app.whenReady();
    },
    catch: (error) => error,
  });

  electronApp.setAppUserModelId("com.electron");
  app.setAccessibilitySupportEnabled(true);

  yield* windows.create;

  const onBrowserWindowCreated = (
    _event: Electron.Event,
    window: BrowserWindow,
  ): void => {
    optimizer.watchWindowShortcuts(window);
  };

  const onActivate = (): void => {
    if (platform.isMacOS) {
      Effect.runFork(
        windows.isCreated.pipe(
          Effect.flatMap((isCreated) => {
            if (!isCreated) {
              return windows.create.pipe(Effect.asVoid);
            }
            return windows.show;
          }),
          Effect.catch((error) => {
            logger.error("Failed to handle app activate", error);
            return Effect.void;
          }),
        ),
      );
    } else if (BrowserWindow.getAllWindows().length === 0) {
      Effect.runFork(
        windows.create.pipe(
          Effect.asVoid,
          Effect.catch((error) => {
            logger.error("Failed to create window on activate", error);
            return Effect.void;
          }),
        ),
      );
    }
  };

  const onWindowAllClosed = (): void => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  };

  const onBeforeQuit = (): void => {
    if (platform.isMacOS) {
      Effect.runFork(
        windows.destroy.pipe(
          Effect.catch((error) => {
            logger.error("Failed to destroy window before quit", error);
            return Effect.void;
          }),
        ),
      );
    }
  };

  app.on("browser-window-created", onBrowserWindowCreated);
  app.on("activate", onActivate);
  app.on("window-all-closed", onWindowAllClosed);
  app.on("before-quit", onBeforeQuit);

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      app.off("browser-window-created", onBrowserWindowCreated);
      app.off("activate", onActivate);
      app.off("window-all-closed", onWindowAllClosed);
      app.off("before-quit", onBeforeQuit);
    }),
  );

  return yield* Effect.never;
});
