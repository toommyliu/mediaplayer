import { optimizer, platform } from "@electron-toolkit/utils";
import { Effect, Layer } from "effect";
import { app, BrowserWindow } from "electron";
import { Shutdown } from "../application/Shutdown";
import { ElectronCallbacks } from "../runtime/ElectronCallbacks";
import { WindowManager } from "./WindowManager";

export const ApplicationLifecycleLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const callbacks = yield* ElectronCallbacks;
    const shutdown = yield* Shutdown;
    const windows = yield* WindowManager;

    const onBrowserWindowCreated = (_event: Electron.Event, window: BrowserWindow): void => {
      optimizer.watchWindowShortcuts(window);
    };

    const onActivate = (): void => {
      callbacks.run(
        "application.activate",
        platform.isMacOS
          ? windows.hasWindows.pipe(
              Effect.flatMap((hasWindows) =>
                hasWindows ? windows.showLastFocused : windows.create.pipe(Effect.asVoid),
              ),
            )
          : Effect.sync(() => BrowserWindow.getAllWindows().length === 0).pipe(
              Effect.flatMap((shouldCreate) =>
                shouldCreate ? windows.create.pipe(Effect.asVoid) : Effect.void,
              ),
            ),
      );
    };

    const onWindowAllClosed = (): void => {
      if (!platform.isMacOS) app.quit();
    };

    const onBeforeQuit = (event: Electron.Event): void => {
      event.preventDefault();
      callbacks.run("application.before-quit", shutdown.request("before-quit"));
    };

    const onSigint = (): void => {
      callbacks.run("process.sigint", shutdown.request("SIGINT"));
    };
    const onSigterm = (): void => {
      callbacks.run("process.sigterm", shutdown.request("SIGTERM"));
    };

    app.on("browser-window-created", onBrowserWindowCreated);
    app.on("activate", onActivate);
    app.on("window-all-closed", onWindowAllClosed);
    app.on("before-quit", onBeforeQuit);
    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        app.off("browser-window-created", onBrowserWindowCreated);
        app.off("activate", onActivate);
        app.off("window-all-closed", onWindowAllClosed);
        app.off("before-quit", onBeforeQuit);
        process.off("SIGINT", onSigint);
        process.off("SIGTERM", onSigterm);
      }),
    );

    yield* windows.create;
  }),
);
