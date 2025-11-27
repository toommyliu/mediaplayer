import { registerIpcMain } from "@egoist/tipc/main";
import { electronApp, platform, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow } from "electron";
import windowManager from "./windowManager";
import "./input";
import "./menu";
import { router } from "./tipc";

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

registerIpcMain(router);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Require accessibility support for macOS
  // Which is required for MediaKeys to work
  app.setAccessibilitySupportEnabled(true);

  windowManager.create();

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (platform.isMacOS) {
      if (!windowManager.isCreated()) {
        windowManager.create();
      } else if (windowManager.isCreated()) {
        windowManager.show();
      }
    } else if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.create();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle app quit - properly destroy window on macOS
app.on("before-quit", () => {
  if (platform.isMacOS) {
    windowManager.destroy();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
