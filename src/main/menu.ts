import { getRendererHandlers } from "@egoist/tipc/main";
import { platform } from "@electron-toolkit/utils";
import { BrowserWindow, Menu } from "electron";
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
      click: async (_menuItem, browserWindow) => {
        const ret = await showFilePicker("file");
        if (!ret || browserWindow?.isDestroyed()) return;

        if (!(browserWindow instanceof BrowserWindow)) {
          logger.error("browserWindow is not an instance of BrowserWindow");
          return;
        }

        console.log("ret", ret);
        const handlers = getRendererHandlers<RendererHandlers>(browserWindow.webContents);
        handlers.addFile.send(ret);
      }
    },
    {
      label: "Open Folder",
      accelerator: "CmdOrCtrl+Shift+O",
      click: async (_menuItem, browserWindow) => {
        const ret = await showFilePicker("folder");
        if (!ret || browserWindow?.isDestroyed()) return;

        if (!(browserWindow instanceof BrowserWindow)) {
          logger.error("browserWindow is not an instance of BrowserWindow");
          return;
        }

        const handlers = getRendererHandlers<RendererHandlers>(browserWindow.webContents);
        handlers.addFolder.send(ret);
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
