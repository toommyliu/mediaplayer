import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import icon from "../../resources/icon.png?asset";
import "./ipc";

const VIDEO_EXTENSIONS = ["mp4", "mov", "ogv", "webm", "avi", "mkv", "m4v"];

interface FileNode {
  path?: string;
  name?: string;
  files?: FileNode[];
}

interface FileTree {
  rootPath: string;
  files: FileNode[];
}

async function buildFileTree(dirPath: string): Promise<FileTree> {
  const rootPath = dirPath;
  const ret: FileTree = {
    rootPath,
    files: []
  };

  for (const entry of await readdir(dirPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const subDirPath = join(dirPath, entry.name);
      const subTree = await buildFileTree(subDirPath);
      ret.files.push({
        path: subDirPath,
        files: subTree.files
      });
    } else {
      const filePath = join(dirPath, entry.name);
      if (VIDEO_EXTENSIONS.some((ext) => extname(filePath).toLowerCase() === `.${ext}`)) {
        ret.files.push({
          path: filePath,
          name: entry.name
        });
      }
    }
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

  ipcMain.handle("start-file-browser", async () => {
    const res = await dialog.showOpenDialog({
      defaultPath: app.getPath("downloads"),
      properties: ["openDirectory", "openFile", "multiSelections"],
      filters: [
        { name: "Video Files", extensions: VIDEO_EXTENSIONS },
        { name: "All Files", extensions: ["*"] }
      ]
    });

    if (res.canceled || res.filePaths.length === 0) {
      return null;
    }

    try {
      console.log("res.filePaths[0]:", res.filePaths[0]);

      const ret = await buildFileTree(res.filePaths[0]);
      console.log("file tree:", ret);

      return ret;
    } catch (error) {
      console.error("Error building folder structure:", error);
      return null;
    }
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
