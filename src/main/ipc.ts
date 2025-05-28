import { ipcMain, shell } from "electron";

ipcMain.on("open-file-explorer", (_ev, path: string) => {
  try {
    console.log("open-file-explorer", path);
    shell.showItemInFolder(path);
  } catch {}
});
