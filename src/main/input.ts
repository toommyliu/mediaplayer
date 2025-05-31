import { app, BrowserWindow, globalShortcut, systemPreferences } from "electron";

app.on("ready", async () => {
  const isTrustedAccessibilityClient = systemPreferences.isTrustedAccessibilityClient(true);

  if (!isTrustedAccessibilityClient) {
    console.log("Accessibility permissions are not granted. Media keys may not work as expected.");
    return;
  }

  // Forward to the renderer since they can't track these
  globalShortcut.register("MediaPreviousTrack", () => {
    console.log("Media Previous Track");
    BrowserWindow.getFocusedWindow()?.webContents.send("media-previous-track");
  });

  globalShortcut.register("MediaNextTrack", () => {
    console.log("Media Next Track");
    BrowserWindow.getFocusedWindow()?.webContents.send("media-next-track");
  });

  globalShortcut.register("MediaPlayPause", () => {
    console.log("Media Play/Pause");
    BrowserWindow.getFocusedWindow()?.webContents.send("media-play-pause");
  });
});
