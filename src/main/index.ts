import { join } from "node:path";
import { registerIpcMain } from "@egoist/tipc/main";
import { electronApp, is, platform, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, shell } from "electron";
import icon from "../../resources/icon.png?asset";
import "./input";
import "./menu";
import { router } from "./tipc";

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

registerIpcMain(router);

export let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  // Create the browser window.
  const window = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(platform.isLinux ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webSecurity: false,
      contextIsolation: true
    }
  });

  mainWindow = window;

  window.on("ready-to-show", () => {
    window.show();
    window.maximize();

    if (is.dev) {
      window.webContents.openDevTools({
        mode: "right"
      });
    }
  });

  window.on("close", (event) => {
    if (platform.isMacOS) {
      event.preventDefault();
      window.hide();
    } else {
      mainWindow = null;
    }
  });

  window.on("closed", () => {
    mainWindow = null;
  });

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}

/**
 * Gets the main window, creating it if it doesn't exist or is destroyed
 */
export function getOrCreateMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow?.isDestroyed()) {
    if (platform.isMacOS && !mainWindow.isVisible()) mainWindow.show();

    return mainWindow;
  }

  return createWindow();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Require accessibility support for macOS
  // Which is required for MediaKeys to work
  app.setAccessibilitySupportEnabled(true);

  createWindow();

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
      if (mainWindow === null) {
        createWindow();
      } else if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    } else if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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
  if (platform.isMacOS && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners("close");
    mainWindow.destroy();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
