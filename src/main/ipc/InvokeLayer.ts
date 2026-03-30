import type {
  IpcInvokeRequestMap,
  IpcInvokeResponseMap,
} from "../../shared/ipc";
import { sep } from "node:path";
import { platform } from "@electron-toolkit/utils";
import { Effect, Layer } from "effect";
import { ipcMain, shell } from "electron";
import { IPC_INVOKE_CHANNELS } from "../../shared/ipc";
import { LoggerService } from "../logging/Service";
import { MediaService } from "../media/Service";
import { WindowService } from "../windows/Service";

type IpcInvokeName = keyof IpcInvokeRequestMap;
type IpcInvokeEnvironment = LoggerService | MediaService | WindowService;

export const IpcInvokeLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const logger = yield* LoggerService;
    const media = yield* MediaService;
    const windows = yield* WindowService;

    const handlers: {
      [K in IpcInvokeName]: (
        payload: IpcInvokeRequestMap[K],
      ) => Effect.Effect<IpcInvokeResponseMap[K], unknown, never>;
    } = {
      enterFullscreen: () => windows.setFullScreen(true),
      exitFullscreen: () => windows.setFullScreen(false),
      selectFile: () => media.showFilePicker("file"),
      selectFolder: () => media.showFilePicker("folder"),
      selectFileOrFolder: () => media.showFilePicker("both"),
      readDirectory: (path) => media.loadDirectoryContents(path),
      getAllVideoFiles: (path) => media.getAllVideoFilesRecursive(path),
      showItemInFolder: (path) =>
        Effect.sync(() => {
          shell.showItemInFolder(path);
        }).pipe(
          Effect.catch((error) => {
            logger.error("Error showing item in folder", error);
            return Effect.void;
          }),
        ),
      getPlatform: () =>
        Effect.succeed({
          isMacOS: platform.isMacOS,
          isWindows: platform.isWindows,
          isLinux: platform.isLinux,
          pathSep: sep,
        }),
    };

    const services = yield* Effect.services<IpcInvokeEnvironment>();
    const runWithServices = Effect.runPromiseWith(services);

    const registerHandler = <K extends IpcInvokeName>(
      name: K,
      handler: (
        payload: IpcInvokeRequestMap[K],
      ) => Effect.Effect<IpcInvokeResponseMap[K], unknown, never>,
    ): void => {
      const channel = IPC_INVOKE_CHANNELS[name];
      ipcMain.removeHandler(channel);
      ipcMain.handle(
        channel,
        async (_event, payload: IpcInvokeRequestMap[K]) => {
          return await runWithServices(handler(payload));
        },
      );
    };

    registerHandler("enterFullscreen", handlers.enterFullscreen);
    registerHandler("exitFullscreen", handlers.exitFullscreen);
    registerHandler("selectFile", handlers.selectFile);
    registerHandler("selectFolder", handlers.selectFolder);
    registerHandler("selectFileOrFolder", handlers.selectFileOrFolder);
    registerHandler("readDirectory", handlers.readDirectory);
    registerHandler("getAllVideoFiles", handlers.getAllVideoFiles);
    registerHandler("showItemInFolder", handlers.showItemInFolder);
    registerHandler("getPlatform", handlers.getPlatform);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const channel of Object.values(IPC_INVOKE_CHANNELS)) {
          ipcMain.removeHandler(channel);
        }
      }),
    );
  }),
);
