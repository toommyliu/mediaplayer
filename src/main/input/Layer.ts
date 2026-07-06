import { Effect, Layer } from "effect";
import { app, globalShortcut, systemPreferences } from "electron";
import { RendererEventsService } from "../ipc/RendererEvents";
import { LoggerService } from "../logging/Service";
import { WindowService } from "../windows/Service";

const MANAGED_SHORTCUTS = ["MediaPreviousTrack", "MediaNextTrack", "MediaPlayPause"] as const;
type ManagedShortcut = (typeof MANAGED_SHORTCUTS)[number];
type MediaHandlerName = "mediaNextTrack" | "mediaPlayPause" | "mediaPreviousTrack";

export const InputLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const logger = yield* LoggerService;
    const windows = yield* WindowService;
    const rendererEvents = yield* RendererEventsService;

    let eventListenersRegistered = false;
    let accessibilityPermissionGranted = false;
    const ownedShortcuts = new Set<string>();
    const windowUnsubscribers: Array<() => void> = [];

    const services = yield* Effect.services<
      LoggerService | WindowService | RendererEventsService
    >();
    const runWithServices = Effect.runForkWith(services);

    const refreshAccessibilityPermission = (prompt = false): void => {
      try {
        accessibilityPermissionGranted = systemPreferences.isTrustedAccessibilityClient(prompt);
      } catch (error) {
        accessibilityPermissionGranted = false;
        logger.error("Failed to determine accessibility permission", error);
      }
    };

    const invokeRendererHandler = (handler: MediaHandlerName): Effect.Effect<void> =>
      Effect.gen(function* () {
        const focusedWindow = yield* windows.getFocusedWindow;
        const lastFocusedWindow = yield* windows.getLastFocusedWindow;
        const window = focusedWindow ?? lastFocusedWindow;
        if (!window || window.isDestroyed()) {
          logger.debug("No valid window available for media key handler");
          return;
        }

        const webContents = window.webContents;
        if (!webContents) {
          logger.debug("Window webContents not available for media key handler");
          return;
        }

        yield* rendererEvents.emit(webContents, handler, undefined);
      }).pipe(
        Effect.catch((error) => {
          logger.error(`Failed to invoke renderer handler ${String(handler)}`, error);
          return Effect.void;
        }),
      );

    const getShortcutHandler = (shortcut: ManagedShortcut): Effect.Effect<void> => {
      switch (shortcut) {
        case "MediaPreviousTrack":
          return invokeRendererHandler("mediaPreviousTrack");
        case "MediaNextTrack":
          return invokeRendererHandler("mediaNextTrack");
        case "MediaPlayPause":
          return invokeRendererHandler("mediaPlayPause");
      }
    };

    const registerGlobalShortcuts = (): void => {
      refreshAccessibilityPermission(false);
      if (!accessibilityPermissionGranted) return;

      try {
        for (const shortcut of MANAGED_SHORTCUTS) {
          if (globalShortcut.isRegistered(shortcut)) {
            logger.debug(`Global shortcut already registered: ${shortcut}`);
            continue;
          }

          try {
            const ok = globalShortcut.register(shortcut, () => {
              runWithServices(
                getShortcutHandler(shortcut).pipe(
                  Effect.catch((error) => {
                    logger.error(`Shortcut handler failed for ${shortcut}`, error);
                    return Effect.void;
                  }),
                ),
              );
            });

            if (!ok) {
              logger.warn(`Global shortcut registration returned false for ${shortcut}`);
            } else {
              // logger.debug(`Registered global shortcut: ${shortcut}`);
              ownedShortcuts.add(shortcut);
            }
          } catch (error) {
            logger.error(`Failed to register global shortcut ${shortcut}`, error);
          }
        }
      } catch (error) {
        logger.error("Failed to register global shortcuts", error);
      }
    };

    const unregisterGlobalShortcuts = (): void => {
      try {
        for (const shortcut of Array.from(ownedShortcuts)) {
          try {
            if (globalShortcut.isRegistered(shortcut)) {
              globalShortcut.unregister(shortcut);
              // logger.debug(`Unregistered global shortcut: ${shortcut}`);
            }
            ownedShortcuts.delete(shortcut);
          } catch (error) {
            logger.error(`Failed to unregister owned global shortcut ${shortcut}`, error);
          }
        }
      } catch (error) {
        logger.error("Failed to unregister global shortcuts", error);
      }
    };

    const cleanupEventListeners = (): void => {
      for (const unsubscribe of windowUnsubscribers.splice(0)) {
        try {
          unsubscribe();
        } catch {
          // no-op
        }
      }

      unregisterGlobalShortcuts();
      eventListenersRegistered = false;
    };

    const setupWindowEventListeners = (): void => {
      if (eventListenersRegistered) return;

      runWithServices(
        Effect.gen(function* () {
          const onFocusUnsub = yield* windows.on("focus", (window) => {
            logger.debug("Window focused, registering global shortcuts");
            registerGlobalShortcuts();
            runWithServices(rendererEvents.emit(window.webContents, "windowFocus", undefined));
          });

          const onBlurUnsub = yield* windows.on("blur", (window) => {
            logger.debug("Window blurred");
            runWithServices(rendererEvents.emit(window.webContents, "windowBlur", undefined));

            setTimeout(() => {
              runWithServices(
                windows.getFocusedWindow.pipe(
                  Effect.flatMap((focusedWindow) =>
                    Effect.sync(() => {
                      if (!focusedWindow) {
                        unregisterGlobalShortcuts();
                      }
                    }),
                  ),
                  Effect.catch((error) => {
                    logger.error("Failed to handle window blur", error);
                    return Effect.void;
                  }),
                ),
              );
            }, 0);
          });

          const onClosedUnsub = yield* windows.on("closed", () => {
            runWithServices(
              windows.hasWindows.pipe(
                Effect.flatMap((hasWindows) =>
                  Effect.sync(() => {
                    if (!hasWindows) {
                      unregisterGlobalShortcuts();
                    }
                  }),
                ),
                Effect.catch((error) => {
                  logger.error("Failed to handle window closed", error);
                  return Effect.void;
                }),
              ),
            );
          });

          const onEnterFullscreenUnsub = yield* windows.on("enter-full-screen", (window) => {
            runWithServices(
              rendererEvents.emit(window.webContents, "windowFullscreenEnter", undefined),
            );
          });

          const onLeaveFullscreenUnsub = yield* windows.on("leave-full-screen", (window) => {
            runWithServices(
              rendererEvents.emit(window.webContents, "windowFullscreenExit", undefined),
            );
          });

          windowUnsubscribers.push(
            onFocusUnsub,
            onBlurUnsub,
            onClosedUnsub,
            onEnterFullscreenUnsub,
            onLeaveFullscreenUnsub,
          );
          eventListenersRegistered = true;
        }).pipe(
          Effect.catch((error) => {
            logger.error("Failed to setup window event listeners", error);
            return Effect.void;
          }),
        ),
      );
    };

    const registerAppListeners = (): Array<() => void> => {
      const onReady = (): void => {
        refreshAccessibilityPermission(true);
        if (!accessibilityPermissionGranted) {
          logger.warn("accessibility permissions not granted, global shortcuts will not work");
        }

        setupWindowEventListeners();

        runWithServices(
          windows.getFocusedWindow.pipe(
            Effect.flatMap((focusedWindow) =>
              Effect.sync(() => {
                if (focusedWindow) {
                  registerGlobalShortcuts();
                }
              }),
            ),
            Effect.catch((error) => {
              logger.error("Error while checking focused window", error);
              return Effect.void;
            }),
          ),
        );
      };

      const onBeforeQuit = (): void => {
        logger.debug("App quitting, cleaning up input handlers");
        cleanupEventListeners();
        unregisterGlobalShortcuts();
      };

      const onWindowAllClosed = (): void => {
        unregisterGlobalShortcuts();
      };

      if (app.isReady()) {
        onReady();
      } else {
        app.on("ready", onReady);
      }
      app.on("before-quit", onBeforeQuit);
      app.on("window-all-closed", onWindowAllClosed);

      return [
        () => app.off("ready", onReady),
        () => app.off("before-quit", onBeforeQuit),
        () => app.off("window-all-closed", onWindowAllClosed),
      ];
    };

    const appUnsubscribers = registerAppListeners();

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        cleanupEventListeners();
        unregisterGlobalShortcuts();
        for (const unsubscribe of appUnsubscribers) {
          try {
            unsubscribe();
          } catch {
            // no-op
          }
        }
      }),
    );
  }),
);
