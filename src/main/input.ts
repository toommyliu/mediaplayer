import { getRendererHandlers } from "@egoist/tipc/main";
import { app, globalShortcut, systemPreferences, BrowserWindow } from "electron";
import { logger } from "./logger";
import type { RendererHandlers } from "./tipc";
import { getMainWindow, off, on, once } from "./windowManager";

const MANAGED_SHORTCUTS = ["MediaPreviousTrack", "MediaNextTrack", "MediaPlayPause"] as const;

let eventListenersRegistered = false;
let accessibilityPermissionGranted = false;
const ownedShortcuts = new Set<string>();

function refreshAccessibilityPermission(prompt = false): void {
  try {
    accessibilityPermissionGranted = systemPreferences.isTrustedAccessibilityClient(prompt);
  } catch (error) {
    accessibilityPermissionGranted = false;
    logger.error("Failed to determine accessibility permission:", error);
  }
}

function invokeRendererHandler(window: BrowserWindow | null, handler: keyof RendererHandlers) {
  return async (): Promise<void> => {
    if (!window || window.isDestroyed()) {
      logger.debug("No valid main window available for media key handler");
      return;
    }

    const webContents = window.webContents;
    if (!webContents) {
      logger.debug("Window webContents not available for media key handler");
      return;
    }

    try {
      const handlers = getRendererHandlers<RendererHandlers>(webContents);
      if (!handlers) return;
      switch (handler) {
        case "mediaNextTrack":
          await handlers.mediaNextTrack?.invoke?.();
          break;
        case "mediaPlayPause":
          await handlers.mediaPlayPause?.invoke?.();
          break;
        case "mediaPreviousTrack":
          await handlers.mediaPreviousTrack?.invoke?.();
          break;
        default:
          logger.warn(`Unknown renderer handler requested: ${String(handler)}`);
      }
    } catch (error) {
      logger.error(`Failed to invoke renderer handler ${String(handler)}:`, error);
    }
  };
}

function registerGlobalShortcuts(): void {
  refreshAccessibilityPermission(false);
  if (!accessibilityPermissionGranted) return;

  try {
    for (const shortcut of MANAGED_SHORTCUTS) {
      if (globalShortcut.isRegistered(shortcut)) {
        logger.debug(`Global shortcut already registered: ${shortcut}`);
        continue;
      }

      let handler: () => Promise<void> | void;
      switch (shortcut) {
        case "MediaPreviousTrack":
          handler = async () => {
            const window = getMainWindow();
            const invoker = invokeRendererHandler(window, "mediaPreviousTrack");
            await invoker();
          };
          break;
        case "MediaNextTrack":
          handler = async () => {
            const window = getMainWindow();
            const invoker = invokeRendererHandler(window, "mediaNextTrack");
            await invoker();
          };
          break;
        case "MediaPlayPause":
          handler = async () => {
            const window = getMainWindow();
            const invoker = invokeRendererHandler(window, "mediaPlayPause");
            await invoker();
          };
          break;
        default:
          handler = () => {
            logger.warn(`Tried to handle unknown shortcut: ${shortcut}`);
          };
      }

      try {
        const ok = globalShortcut.register(shortcut, () => void handler());
        if (!ok) {
          logger.warn(`Global shortcut registration returned false for ${shortcut}`);
        } else {
          logger.debug(`Registered global shortcut: ${shortcut}`);
          ownedShortcuts.add(shortcut);
        }
      } catch (error) {
        logger.error(`Failed to register global shortcut ${shortcut}:`, error);
      }
    }
  } catch (error) {
    logger.error("Failed to register global shortcuts:", error);
  }
}

function unregisterGlobalShortcuts(): void {
  try {
    for (const shortcut of Array.from(ownedShortcuts)) {
      try {
        if (globalShortcut.isRegistered(shortcut)) {
          globalShortcut.unregister(shortcut);
          logger.debug(`Unregistered global shortcut: ${shortcut}`);
        }
        ownedShortcuts.delete(shortcut);
      } catch (error) {
        logger.error(`Failed to unregister owned global shortcut ${shortcut}:`, error);
      }
    }
  } catch (error) {
    logger.error("Failed to unregister global shortcuts:", error);
  }
}

const handleWindowFocus = (): void => {
  logger.debug("mainWindow focused, registering global shortcuts");
  registerGlobalShortcuts();
};

const handleWindowBlur = (): void => {
  logger.debug("mainWindow blurred, unregistering global shortcuts");
  unregisterGlobalShortcuts();
};

function setupWindowEventListeners(): void {
  if (eventListenersRegistered) return;
  if (!getMainWindow()) return;

  off("focus", handleWindowFocus);
  off("blur", handleWindowBlur);
  off("closed", cleanupEventListeners);

  on("focus", handleWindowFocus);
  on("blur", handleWindowBlur);
  on("closed", cleanupEventListeners);

  eventListenersRegistered = true;
}

function cleanupEventListeners(): void {
  off("focus", handleWindowFocus);
  off("blur", handleWindowBlur);
  off("closed", cleanupEventListeners);

  unregisterGlobalShortcuts();

  eventListenersRegistered = false;
}

app.on("ready", async () => {
  refreshAccessibilityPermission(true);
  if (!accessibilityPermissionGranted) {
    logger.warn("accessibility permissions not granted, global shortcuts will not work");
  }

  if (getMainWindow()) {
    setupWindowEventListeners();
  } else {
    once("show", setupWindowEventListeners);
  }
});

app.on("before-quit", () => {
  logger.debug("App quitting, cleaning up input handlers");
  cleanupEventListeners();
  unregisterGlobalShortcuts();
});

app.on("window-all-closed", () => {
  cleanupEventListeners();
  unregisterGlobalShortcuts();
});
