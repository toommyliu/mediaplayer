import { sep } from "node:path";
import { tipc } from "@egoist/tipc/main";
import { platform } from "@electron-toolkit/utils";
import { shell } from "electron";
import { logger } from "./logger";
import { showFilePicker, loadDirectoryContents, getAllVideoFilesRecursive, type PickerResult } from "./utils";
import { mainWindow } from ".";

export const tipcInstance = tipc.create();

export const router = {
  enterFullscreen: tipcInstance.procedure.action(async () => {
    mainWindow?.setFullScreen(true);
  }),
  exitFullscreen: tipcInstance.procedure.action(async () => {
    mainWindow?.setFullScreen(false);
  }),

  selectFile: tipcInstance.procedure.action(async () => showFilePicker("file")),
  selectFolder: tipcInstance.procedure.action(async () => showFilePicker("folder")),
  selectFileOrFolder: tipcInstance.procedure.action(async () => showFilePicker("both")),

  readDirectory: tipcInstance.procedure
    .input<string>()
    .action(async ({ input }) => loadDirectoryContents(input)),

  getAllVideoFiles: tipcInstance.procedure
    .input<string>()
    .action(async ({ input }) => getAllVideoFilesRecursive(input)),

  showItemInFolder: tipcInstance.procedure.input<string>().action(async ({ input }) => {
    try {
      shell.showItemInFolder(input);
    } catch (error) {
      logger.error(error, "Error showing item in folder");
    }
  }),

  getPlatform: tipcInstance.procedure.action(async () => ({
    isMacOS: platform.isMacOS,
    isWindows: platform.isWindows,
    isLinux: platform.isLinux,
    pathSep: sep
  }))
};

export type Router = typeof router;

export type RendererHandlers = {
  addFile(res: PickerResult): void;
  addFolder(res: PickerResult): void;

  mediaNextTrack(): void;
  mediaPlayPause(): void;
  mediaPreviousTrack(): void;
};
