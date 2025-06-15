import { getRendererHandlers } from "@egoist/tipc/main";
import { app, BrowserWindow, globalShortcut, systemPreferences } from "electron";
import { setTimeout } from "node:timers/promises";
import { mainWindow } from "./index";
import { logger } from "./logger";
import { RendererHandlers } from "./tipc";

const isTrustedAccessibilityClient = systemPreferences.isTrustedAccessibilityClient(true);

// TODO: memory leak somewhere?

function registerGlobalShortcuts(): void {
  if (!isTrustedAccessibilityClient) return;

  globalShortcut.register("MediaPreviousTrack", () => {
    const handlers = getRendererHandlers<RendererHandlers>(
      BrowserWindow.getFocusedWindow()!.webContents
    );

    handlers?.mediaPreviousTrack?.invoke();
  });

  globalShortcut.register("MediaNextTrack", () => {
    const handlers = getRendererHandlers<RendererHandlers>(
      BrowserWindow.getFocusedWindow()!.webContents
    );

    handlers?.mediaNextTrack?.invoke();
  });

  globalShortcut.register("MediaPlayPause", () => {
    const handlers = getRendererHandlers<RendererHandlers>(
      BrowserWindow.getFocusedWindow()!.webContents
    );

    handlers?.mediaPlayPause?.invoke();
  });
}

app.on("ready", async () => {
  if (!isTrustedAccessibilityClient) {
    logger.warn("accessibility permissions not granted, global shortcuts will not work");
  }

  // Ensure that global shortcuts only work when the main window is focused
  while (!mainWindow) await setTimeout(100);

  mainWindow?.on("focus", () => {
    globalShortcut.unregisterAll();
    registerGlobalShortcuts();
  });

  mainWindow?.on("blur", () => {
    globalShortcut.unregisterAll();
  });
});
