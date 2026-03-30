import { sep } from "node:path";
import { platform } from "@electron-toolkit/utils";
import { ipcMain, shell, type WebContents } from "electron";
import {
  IPC_EVENT_CHANNELS,
  IPC_INVOKE_CHANNELS,
  type IpcInvokeRequestMap,
  type IpcInvokeResponseMap,
  type RendererEventPayloadMap
} from "../shared/ipc";
import { logger } from "./logger";
import { getAllVideoFilesRecursive, loadDirectoryContents, showFilePicker } from "./utils";
import { setFullScreen } from "./windowManager";

type IpcInvokeName = keyof IpcInvokeRequestMap;

function registerHandler<K extends IpcInvokeName>(
  name: K,
  handler: (
    payload: IpcInvokeRequestMap[K]
  ) => Promise<IpcInvokeResponseMap[K]> | IpcInvokeResponseMap[K]
): void {
  const channel = IPC_INVOKE_CHANNELS[name];
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, (_event, payload: IpcInvokeRequestMap[K]) => handler(payload));
}

export function registerIpcHandlers(): void {
  registerHandler("enterFullscreen", async () => {
    setFullScreen(true);
  });

  registerHandler("exitFullscreen", async () => {
    setFullScreen(false);
  });

  registerHandler("selectFile", async () => showFilePicker("file"));
  registerHandler("selectFolder", async () => showFilePicker("folder"));
  registerHandler("selectFileOrFolder", async () => showFilePicker("both"));

  registerHandler("readDirectory", async (path) => loadDirectoryContents(path));
  registerHandler("getAllVideoFiles", async (path) => getAllVideoFilesRecursive(path));

  registerHandler("showItemInFolder", async (path) => {
    try {
      shell.showItemInFolder(path);
    } catch (error) {
      logger.error(error, "Error showing item in folder");
    }
  });

  registerHandler("getPlatform", async () => ({
    isMacOS: platform.isMacOS,
    isWindows: platform.isWindows,
    isLinux: platform.isLinux,
    pathSep: sep
  }));
}

export function emitRendererEvent<K extends keyof RendererEventPayloadMap>(
  webContents: WebContents,
  eventName: K,
  payload: RendererEventPayloadMap[K]
): void {
  webContents.send(IPC_EVENT_CHANNELS[eventName], payload);
}
