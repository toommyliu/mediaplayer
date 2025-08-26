import { getRendererHandlers } from "@egoist/tipc/main";
import { app, globalShortcut, systemPreferences } from "electron";
import { getOrCreateMainWindow, mainWindow } from "./index";
import { logger } from "./logger";
import type { RendererHandlers } from "./tipc";

const isTrustedAccessibilityClient = systemPreferences.isTrustedAccessibilityClient(true);

let eventListenersRegistered = false;

function registerGlobalShortcuts(): void {
  if (!isTrustedAccessibilityClient) return;

  globalShortcut.unregisterAll();

  try {
    globalShortcut.register("MediaPreviousTrack", async () => {
      try {
        const window = getOrCreateMainWindow();
        const handlers = getRendererHandlers<RendererHandlers>(window.webContents);
        await handlers?.mediaPreviousTrack?.invoke();
      } catch (error) {
        logger.error("Failed to handle MediaPreviousTrack:", error);
      }
    });

    globalShortcut.register("MediaNextTrack", async () => {
      try {
        const window = getOrCreateMainWindow();
        const handlers = getRendererHandlers<RendererHandlers>(window.webContents);
        await handlers?.mediaNextTrack?.invoke();
      } catch (error) {
        logger.error("Failed to handle MediaNextTrack:", error);
      }
    });

    globalShortcut.register("MediaPlayPause", async () => {
      try {
        const window = getOrCreateMainWindow();
        const handlers = getRendererHandlers<RendererHandlers>(window.webContents);
        await handlers?.mediaPlayPause?.invoke();
      } catch (error) {
        logger.error("Failed to handle MediaPlayPause:", error);
      }
    });
  } catch (error) {
    logger.error("Failed to register global shortcuts:", error);
  }
}

function unregisterGlobalShortcuts(): void {
  try {
    globalShortcut.unregisterAll();
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
  if (!mainWindow || eventListenersRegistered) return;

  mainWindow.removeListener("focus", handleWindowFocus);
  mainWindow.removeListener("blur", handleWindowBlur);

  mainWindow.on("focus", handleWindowFocus);
  mainWindow.on("blur", handleWindowBlur);

  eventListenersRegistered = true;
}

function cleanupEventListeners(): void {
  if (!mainWindow) return;

  mainWindow.removeListener("focus", handleWindowFocus);
  mainWindow.removeListener("blur", handleWindowBlur);
  eventListenersRegistered = false;
}

app.on("ready", async () => {
  if (!isTrustedAccessibilityClient) {
    logger.warn("accessibility permissions not granted, global shortcuts will not work");
  }

  mainWindow?.once("show", () => {
    setupWindowEventListeners();
  });
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
