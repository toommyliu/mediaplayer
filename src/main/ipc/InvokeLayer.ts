import type { IpcInvokeRequestMap, IpcInvokeResponseMap } from "../../shared/ipc";
import { sep } from "node:path";
import { platform } from "@electron-toolkit/utils";
import { Effect, Layer } from "effect";
import { ipcMain, shell } from "electron";
import { IPC_INVOKE_CHANNELS } from "../../shared/ipc";
import { RendererEventsService } from "./RendererEvents";
import { LoggerService } from "../logging/Service";
import { MediaService } from "../media/Service";
import { UserDataService } from "../user-data/Service";
import { WindowService } from "../windows/Service";

type IpcInvokeName = keyof IpcInvokeRequestMap;
type IpcInvokeEnvironment =
  | LoggerService
  | MediaService
  | RendererEventsService
  | UserDataService
  | WindowService;

export const IpcInvokeLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const logger = yield* LoggerService;
    const media = yield* MediaService;
    const rendererEvents = yield* RendererEventsService;
    const userData = yield* UserDataService;
    const windows = yield* WindowService;

    const getEventWindow = (event: Electron.IpcMainInvokeEvent) =>
      windows.getByWebContents(event.sender);

    const broadcastPersistedStoreChanged = (
      event: Electron.IpcMainInvokeEvent,
      name: string,
      value: string | null,
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        const browserWindows = yield* windows.getAll;
        for (const browserWindow of browserWindows) {
          if (browserWindow.webContents.id === event.sender.id) continue;
          yield* rendererEvents
            .emit(browserWindow.webContents, "persistedStoreChanged", {
              name,
              value,
            })
            .pipe(
              Effect.catch((error) => {
                logger.error(`Failed to broadcast persisted store change: ${name}`, error);
                return Effect.void;
              }),
            );
        }
      });

    const handlers: {
      [K in IpcInvokeName]: (
        payload: IpcInvokeRequestMap[K],
        event: Electron.IpcMainInvokeEvent,
      ) => Effect.Effect<IpcInvokeResponseMap[K], unknown, never>;
    } = {
      enterFullscreen: (_payload, event) =>
        Effect.gen(function* () {
          const browserWindow = yield* getEventWindow(event);
          yield* windows.setFullScreen(browserWindow, true);
        }),
      exitFullscreen: (_payload, event) =>
        Effect.gen(function* () {
          const browserWindow = yield* getEventWindow(event);
          yield* windows.setFullScreen(browserWindow, false);
        }),
      selectFile: (_payload, event) =>
        Effect.gen(function* () {
          const browserWindow = yield* getEventWindow(event);
          return yield* media.showFilePicker("file", browserWindow);
        }),
      selectFolder: (_payload, event) =>
        Effect.gen(function* () {
          const browserWindow = yield* getEventWindow(event);
          return yield* media.showFilePicker("folder", browserWindow);
        }),
      selectFileOrFolder: (_payload, event) =>
        Effect.gen(function* () {
          const browserWindow = yield* getEventWindow(event);
          return yield* media.showFilePicker("both", browserWindow);
        }),
      readPersistedStore: (name) => userData.readPersistedStore(name),
      readDirectory: (path) => media.loadDirectoryContents(path),
      removePersistedStore: (name, event) =>
        userData
          .removePersistedStore(name)
          .pipe(Effect.flatMap(() => broadcastPersistedStoreChanged(event, name, null))),
      renameFileSystemItem: (input) => media.renameFileSystemItem(input),
      getAllVideoFiles: (path) => media.getAllVideoFilesRecursive(path),
      getVideoMetadata: (path) => media.getVideoMetadata(path),
      deleteFileSystemItem: (path) =>
        Effect.tryPromise({
          try: async () => {
            await shell.trashItem(path);
          },
          catch: (error) => error,
        }).pipe(
          Effect.catch((error) => {
            logger.error("Error deleting file system item", error);
            return Effect.fail(error);
          }),
        ),
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
      writePersistedStore: (input, event) =>
        userData
          .writePersistedStore(input)
          .pipe(
            Effect.flatMap(() => broadcastPersistedStoreChanged(event, input.name, input.value)),
          ),
    };

    const services = yield* Effect.services<IpcInvokeEnvironment>();
    const runWithServices = Effect.runPromiseWith(services);

    const registerHandler = <K extends IpcInvokeName>(
      name: K,
      handler: (
        payload: IpcInvokeRequestMap[K],
        event: Electron.IpcMainInvokeEvent,
      ) => Effect.Effect<IpcInvokeResponseMap[K], unknown, never>,
    ): void => {
      const channel = IPC_INVOKE_CHANNELS[name];
      ipcMain.removeHandler(channel);
      ipcMain.handle(channel, async (event, payload: IpcInvokeRequestMap[K]) => {
        return await runWithServices(handler(payload, event));
      });
    };

    registerHandler("enterFullscreen", handlers.enterFullscreen);
    registerHandler("exitFullscreen", handlers.exitFullscreen);
    registerHandler("selectFile", handlers.selectFile);
    registerHandler("selectFolder", handlers.selectFolder);
    registerHandler("selectFileOrFolder", handlers.selectFileOrFolder);
    registerHandler("readPersistedStore", handlers.readPersistedStore);
    registerHandler("readDirectory", handlers.readDirectory);
    registerHandler("deleteFileSystemItem", handlers.deleteFileSystemItem);
    registerHandler("removePersistedStore", handlers.removePersistedStore);
    registerHandler("renameFileSystemItem", handlers.renameFileSystemItem);
    registerHandler("getAllVideoFiles", handlers.getAllVideoFiles);
    registerHandler("getVideoMetadata", handlers.getVideoMetadata);
    registerHandler("showItemInFolder", handlers.showItemInFolder);
    registerHandler("getPlatform", handlers.getPlatform);
    registerHandler("writePersistedStore", handlers.writePersistedStore);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const channel of Object.values(IPC_INVOKE_CHANNELS)) {
          ipcMain.removeHandler(channel);
        }
      }),
    );
  }),
);
