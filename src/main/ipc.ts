import { ipcMain, shell } from "electron";
import { platform } from "@electron-toolkit/utils";

ipcMain.on("open-file-explorer", (_ev, path: string) => {
  try {
    console.log("open-file-explorer", path);
    shell.showItemInFolder(path);
  } catch {}
});

ipcMain.handle("get-platform", () => {
  return platform;
});
