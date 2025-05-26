import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join, extname } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import { readdir, stat } from "fs/promises";

const VIDEO_EXTENSIONS = ["mp4", "mov", "ogv", "webm", "avi", "mkv", "m4v"];

async function filterVideoFiles(dirPath: string): Promise<string[]> {
  const ret: string[] = [];

  try {
    const items = await readdir(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      try {
        const stats = await stat(itemPath);

        if (stats.isDirectory()) {
          const subDirVideos = await filterVideoFiles(itemPath);
          ret.push(...subDirVideos);
        } else {
          if (VIDEO_EXTENSIONS.some((ext) => extname(itemPath).toLowerCase() === `.${ext}`)) {
            ret.push(itemPath);
          }
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error(`Error reading directory at ${dirPath}:`, error);
  }

  return ret;
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webSecurity: false, // Allow local file access
      allowRunningInsecureContent: true,
      contextIsolation: true
    }
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    mainWindow.maximize();
    mainWindow.webContents.openDevTools({
      mode: "right"
    });
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on("load-video-file", async (ev) => {
    const res = await dialog.showOpenDialog({
      defaultPath: app.getPath("downloads"),
      properties: ["openFile", "openDirectory", "multiSelections"],
      filters: [
        { name: "Video Files", extensions: VIDEO_EXTENSIONS },
        { name: "All Files", extensions: ["*"] }
      ],
      message: "Select video files or folder to load"
    });

    if (res.canceled || res.filePaths.length === 0) {
      ev.sender.send("video-file-loaded", []);
      return;
    }

    const allVideoFiles: string[] = [];

    for (const path of res.filePaths) {
      try {
        const stats = await stat(path);

        if (stats.isDirectory()) {
          const videoFiles = await filterVideoFiles(path);
          allVideoFiles.push(...videoFiles);
        } else {
          if (VIDEO_EXTENSIONS.some((ext) => extname(path).toLowerCase() === `.${ext}`)) {
            allVideoFiles.push(path);
          }
        }
      } catch (error) {
        console.error(`Error reading path at ${path}:`, error);
      }
    }

    console.log("Selected video files:", allVideoFiles);
    ev.sender.send("video-file-loaded", allVideoFiles);
  });

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
