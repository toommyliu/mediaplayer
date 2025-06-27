import { setTimeout } from "node:timers/promises";
import { getRendererHandlers } from "@egoist/tipc/main";
import { app, BrowserWindow, globalShortcut, systemPreferences } from "electron";
import { logger } from "./logger";
import type { RendererHandlers } from "./tipc";
import { mainWindow } from "./index";

const isTrustedAccessibilityClient = systemPreferences.isTrustedAccessibilityClient(true);

// TODO: memory leak somewhere?

function registerGlobalShortcuts(): void {
  if (!isTrustedAccessibilityClient) return;

  globalShortcut.register("MediaPreviousTrack", async () => {
    const handlers = getRendererHandlers<RendererHandlers>(
      BrowserWindow.getFocusedWindow()!.webContents
    );

    await handlers?.mediaPreviousTrack?.invoke();
  });

  globalShortcut.register("MediaNextTrack", async () => {
    const handlers = getRendererHandlers<RendererHandlers>(
      BrowserWindow.getFocusedWindow()!.webContents
    );

    await handlers?.mediaNextTrack?.invoke();
  });

  globalShortcut.register("MediaPlayPause", async () => {
    const handlers = getRendererHandlers<RendererHandlers>(
      BrowserWindow.getFocusedWindow()!.webContents
    );

    await handlers?.mediaPlayPause?.invoke();
  });
}

app.on("ready", async () => {
  if (!isTrustedAccessibilityClient) {
    logger.warn("accessibility permissions not granted, global shortcuts will not work");
  }

  // Ensure that global shortcuts only work when the main window is focused
  while (!mainWindow) await setTimeout(100);

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
