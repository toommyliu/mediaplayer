import { tipc } from "@egoist/tipc/main";
import { platform } from "@electron-toolkit/utils";
import { showFilePicker, loadDirectoryContents } from "./utils";
import { shell } from "electron";
import { mainWindow } from ".";
import { logger } from "./logger";

export const tipcInstance = tipc.create();

export const router = {
  enterFullscreen: tipcInstance.procedure.action(async () => {
    mainWindow?.setFullScreen(true);
  }),
  exitFullscreen: tipcInstance.procedure.action(async () => {
    mainWindow?.setFullScreen(false);
  }),

  selectFile: tipcInstance.procedure.action(async () => {
    return await showFilePicker("file");
  }),
  selectFolder: tipcInstance.procedure.action(async () => {
    return await showFilePicker("folder");
  }),
  selectFileOrFolder: tipcInstance.procedure.action(async () => {
    return await showFilePicker("both");
  }),

  readDirectory: tipcInstance.procedure.input<string>().action(async ({ input }) => {
    return await loadDirectoryContents(input);
  }),

  showItemInFolder: tipcInstance.procedure.input<string>().action(async ({ input }) => {
    try {
      shell.showItemInFolder(input);
    } catch (error) {
      logger.error(error, "Error showing item in folder");
    }
  }),

  getPlatform: tipcInstance.procedure.action(async () => platform)
};

export type Router = typeof router;

export type RendererHandlers = {
  addFile: (filePath: string) => void;
  addFolder: (folderData: unknown) => void;
};
