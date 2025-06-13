import { app, BrowserWindow, globalShortcut, systemPreferences } from "electron";
import { logger } from "./logger";

app.on("ready", async () => {
  const isTrustedAccessibilityClient = systemPreferences.isTrustedAccessibilityClient(true);

  if (!isTrustedAccessibilityClient) {
    logger.warn("Accessibility permissions are not granted. Media keys may not work as expected.");
    console.log("Accessibility permissions are not granted. Media keys may not work as expected.");
    return;
  }

  // Forward to the renderer since they can't track these
  globalShortcut.register("MediaPreviousTrack", () => {
    console.log("Media Previous Track");
    logger.info("Media Previous Track");
    BrowserWindow.getFocusedWindow()?.webContents.send("media-previous-track");
  });

  globalShortcut.register("MediaNextTrack", () => {
    console.log("Media Next Track");
    logger.info("Media Next Track");
    BrowserWindow.getFocusedWindow()?.webContents.send("media-next-track");
  });

  globalShortcut.register("MediaPlayPause", () => {
    console.log("Media Play/Pause");
    logger.info("Media Play/Pause");
    BrowserWindow.getFocusedWindow()?.webContents.send("media-play-pause");
  });
});
