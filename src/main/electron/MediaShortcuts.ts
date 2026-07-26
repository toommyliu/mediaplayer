import { Effect, Layer, Stream } from "effect";
import { globalShortcut, systemPreferences } from "electron";
import { RendererEvents } from "../ipc/RendererEvents";
import { ElectronCallbacks } from "../runtime/ElectronCallbacks";
import { WindowManager, type WindowEvent } from "./WindowManager";

const SHORTCUTS = {
  MediaNextTrack: "mediaNextTrack",
  MediaPlayPause: "mediaPlayPause",
  MediaPreviousTrack: "mediaPreviousTrack",
} as const;

type Shortcut = keyof typeof SHORTCUTS;

export const MediaShortcutsLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const callbacks = yield* ElectronCallbacks;
    const rendererEvents = yield* RendererEvents;
    const windows = yield* WindowManager;
    const owned = new Set<Shortcut>();

    const emitToPreferredWindow = Effect.fn("MediaShortcuts.emitToPreferredWindow")(function* (
      eventName: (typeof SHORTCUTS)[Shortcut],
    ) {
      const focused = yield* windows.getFocused;
      const lastFocused = yield* windows.getLastFocused;
      const window = focused ?? lastFocused;
      if (!window || window.isDestroyed()) {
        yield* Effect.logDebug("No window is available for media shortcut").pipe(
          Effect.annotateLogs({ eventName }),
        );
        return;
      }
      yield* rendererEvents.emit(window.webContents, eventName, undefined);
    });

    const unregister = Effect.fn("MediaShortcuts.unregister")(function* () {
      yield* Effect.sync(() => {
        for (const shortcut of owned) {
          if (globalShortcut.isRegistered(shortcut)) {
            globalShortcut.unregister(shortcut);
          }
        }
        owned.clear();
      });
    });

    const register = Effect.fn("MediaShortcuts.register")(function* () {
      for (const shortcut of Object.keys(SHORTCUTS) as Shortcut[]) {
        if (owned.has(shortcut) || globalShortcut.isRegistered(shortcut)) continue;

        const registered = yield* Effect.try({
          try: () =>
            globalShortcut.register(shortcut, () => {
              callbacks.run(`shortcut.${shortcut}`, emitToPreferredWindow(SHORTCUTS[shortcut]));
            }),
          catch: (cause) => cause,
        }).pipe(
          Effect.catch((cause) =>
            Effect.logWarning("Global shortcut registration failed", cause).pipe(
              Effect.annotateLogs({ shortcut }),
              Effect.as(false),
            ),
          ),
        );

        if (registered) {
          owned.add(shortcut);
        } else {
          yield* Effect.logWarning("Global shortcut was rejected").pipe(
            Effect.annotateLogs({ shortcut }),
          );
        }
      }
    });

    const handleWindowEvent = Effect.fn("MediaShortcuts.handleWindowEvent")(function* (
      event: WindowEvent,
    ) {
      switch (event._tag) {
        case "Focus":
          yield* register();
          yield* rendererEvents.emit(event.window.webContents, "windowFocus", undefined);
          break;
        case "Blur":
          yield* rendererEvents.emit(event.window.webContents, "windowBlur", undefined);
          yield* Effect.yieldNow;
          if (!(yield* windows.getFocused)) yield* unregister();
          break;
        case "Closed":
          if (!(yield* windows.hasWindows)) yield* unregister();
          break;
        case "EnterFullScreen":
          yield* rendererEvents.emit(event.window.webContents, "windowFullscreenEnter", undefined);
          break;
        case "LeaveFullScreen":
          yield* rendererEvents.emit(event.window.webContents, "windowFullscreenExit", undefined);
          break;
        case "ReadyToShow":
          break;
      }
    });

    const hasPermission = yield* Effect.try({
      try: () => systemPreferences.isTrustedAccessibilityClient(true),
      catch: (cause) => cause,
    }).pipe(
      Effect.catch((cause) =>
        Effect.logWarning("Could not determine accessibility permission", cause).pipe(
          Effect.as(false),
        ),
      ),
    );

    if (!hasPermission) {
      yield* Effect.logWarning(
        "Accessibility permission is unavailable; global media shortcuts are disabled",
      );
    } else if (yield* windows.getFocused) {
      yield* register();
    }

    yield* windows.events.pipe(Stream.runForEach(handleWindowEvent), Effect.forkScoped);
    yield* Effect.addFinalizer(() => unregister());
  }),
);
