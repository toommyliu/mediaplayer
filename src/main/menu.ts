import { getRendererHandlers } from "@egoist/tipc/main";
import { platform } from "@electron-toolkit/utils";
import { Menu } from "electron";
import { getOrCreateMainWindow } from "./index";
import { logger } from "./logger";
import { type RendererHandlers } from "./tipc";
import { showFilePicker } from "./utils";

const macAppMenu: Electron.MenuItemConstructorOptions = { role: "appMenu" };

const fileMenu: Electron.MenuItemConstructorOptions = {
  label: "File",
  submenu: [
    {
      label: "Open File",
      accelerator: "CmdOrCtrl+O",
      click: async () => {
        const ret = await showFilePicker("file");
        if (!ret) return;

        try {
          const browserWindow = getOrCreateMainWindow();
          console.log("ret", ret);
          const handlers = getRendererHandlers<RendererHandlers>(browserWindow.webContents);
          handlers.addFile.send(ret);
        } catch (error) {
          logger.error("Failed to handle file open:", error);
        }
      }
    },
    {
      label: "Open Folder",
      accelerator: "CmdOrCtrl+Shift+O",
      click: async () => {
        const ret = await showFilePicker("folder");
        if (!ret) return;

        try {
          const browserWindow = getOrCreateMainWindow();
          const handlers = getRendererHandlers<RendererHandlers>(browserWindow.webContents);
          handlers.addFolder.send(ret);
        } catch (error) {
          logger.error("Failed to handle folder open:", error);
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
