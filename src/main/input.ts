import { getRendererHandlers } from "@egoist/tipc/main";
import { app, globalShortcut, systemPreferences } from "electron";
import { getOrCreateMainWindow, mainWindow } from "./index";
import { logger } from "./logger";
import type { RendererHandlers } from "./tipc";

const isTrustedAccessibilityClient = systemPreferences.isTrustedAccessibilityClient(true);

// TODO: memory leak somewhere?

function registerGlobalShortcuts(): void {
  if (!isTrustedAccessibilityClient) return;

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
}

app.on("ready", async () => {
  if (!isTrustedAccessibilityClient) {
    logger.warn("accessibility permissions not granted, global shortcuts will not work");
  }

  mainWindow?.once("show", () => {
    mainWindow?.on("focus", () => {
      logger.debug("mainWindow focused, registering global shortcuts");
      globalShortcut.unregisterAll();
      registerGlobalShortcuts();
    });

    mainWindow?.on("blur", () => {
      logger.debug("mainWindow blurred, unregistering global shortcuts");
      globalShortcut.unregisterAll();
    });
  });
});
