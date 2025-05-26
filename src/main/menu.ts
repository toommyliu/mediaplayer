import { Menu } from "electron";
import { platform } from "@electron-toolkit/utils";
import { showFilePicker } from "./utils";
import { mainWindow } from ".";

const macAppMenu: Electron.MenuItemConstructorOptions = { role: "appMenu" };

const fileMenu: Electron.MenuItemConstructorOptions = {
  label: "File",
  submenu: [
    {
      label: "Open File",
      accelerator: "CmdOrCtrl+O",
      click: async () => {
        const ret = await showFilePicker("file");
        if (ret) {
          mainWindow?.webContents?.send("add-file-to-browser", ret);
        }
      }
    },
    {
      label: "Open Folder",
      accelerator: "CmdOrCtrl+Shift+O",
      click: async () => {
        const ret = await showFilePicker("folder");
        if (ret) {
          mainWindow?.webContents?.send("add-folder-to-browser", ret);
        }
      }
    },
    { type: "separator" },
    { role: "close" }
  ]
};

const template: Electron.MenuItemConstructorOptions[] = [
  ...(platform.isMacOS ? [macAppMenu] : []),
  fileMenu,
  { role: "editMenu" },
  { role: "viewMenu" },
  { role: "windowMenu" }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
