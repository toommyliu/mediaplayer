import type { IpcInvokeRequestMap, IpcInvokeResponseMap } from "../../shared/ipc";
import { sep } from "node:path";
import { platform } from "@electron-toolkit/utils";
import { Effect, Layer } from "effect";
import { ipcMain } from "electron";
import { IPC_INVOKE_CHANNELS } from "../../shared/ipc";
import { DesktopShell } from "../electron/DesktopShell";
import { MediaPicker } from "../electron/MediaPicker";
import { WindowManager } from "../electron/WindowManager";
import { MediaLibrary } from "../media/MediaLibrary";
import { PersistedStore } from "../persistence/PersistedStore";
import { ElectronCallbacks } from "../runtime/ElectronCallbacks";
import { RendererEvents } from "./RendererEvents";

type InvokeName = keyof IpcInvokeRequestMap;
type InvokeHandler<K extends InvokeName> = (
  payload: IpcInvokeRequestMap[K],
  event: Electron.IpcMainInvokeEvent,
) => Effect.Effect<IpcInvokeResponseMap[K], unknown>;

type InvokeHandlers = {
  readonly [K in InvokeName]: InvokeHandler<K>;
};

export const IpcServerLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const callbacks = yield* ElectronCallbacks;
    const library = yield* MediaLibrary;
    const persistedStore = yield* PersistedStore;
    const picker = yield* MediaPicker;
    const rendererEvents = yield* RendererEvents;
    const shell = yield* DesktopShell;
    const windows = yield* WindowManager;

    const eventWindow = (event: Electron.IpcMainInvokeEvent) =>
      windows.getByWebContents(event.sender);

    const broadcastPersistedStoreChanged = Effect.fn("IpcServer.broadcastPersistedStoreChanged")(
      function* (event: Electron.IpcMainInvokeEvent, name: string, value: string | null) {
        const browserWindows = yield* windows.getAll;
        yield* Effect.all(
          browserWindows
            .filter((window) => window.webContents.id !== event.sender.id)
            .map((window) =>
              rendererEvents.emit(window.webContents, "persistedStoreChanged", {
                name,
                value,
              }),
            ),
          { discard: true },
        );
      },
    );

    const handlers = {
      deleteFileSystemItem: (path) => shell.trash(path),
      enterFullscreen: (_payload, event) =>
        eventWindow(event).pipe(Effect.flatMap((window) => windows.setFullScreen(window, true))),
      exitFullscreen: (_payload, event) =>
        eventWindow(event).pipe(Effect.flatMap((window) => windows.setFullScreen(window, false))),
      getAllVideoFiles: (path) => library.getAllVideoFiles(path),
      getPlatform: () =>
        Effect.succeed({
          isLinux: platform.isLinux,
          isMacOS: platform.isMacOS,
          isWindows: platform.isWindows,
          pathSep: sep,
        }),
      getVideoMetadata: (path) => library.getVideoMetadata(path),
      readDirectory: (path) => library.loadDirectoryContents(path),
      readPersistedStore: (name) => persistedStore.read(name),
      removePersistedStore: (name, event) =>
        persistedStore
          .remove(name)
          .pipe(Effect.andThen(broadcastPersistedStoreChanged(event, name, null))),
      renameFileSystemItem: (input) => library.renameFileSystemItem(input),
      selectFile: (_payload, event) =>
        eventWindow(event).pipe(Effect.flatMap((window) => picker.show("file", window))),
      selectFileOrFolder: (_payload, event) =>
        eventWindow(event).pipe(Effect.flatMap((window) => picker.show("both", window))),
      selectFolder: (_payload, event) =>
        eventWindow(event).pipe(Effect.flatMap((window) => picker.show("folder", window))),
      showItemInFolder: (path) =>
        shell
          .reveal(path)
          .pipe(Effect.catch((error) => Effect.logWarning("Could not reveal file", error))),
      writePersistedStore: ({ name, value }, event) =>
        persistedStore
          .write({ name, value })
          .pipe(Effect.andThen(broadcastPersistedStoreChanged(event, name, value))),
    } satisfies InvokeHandlers;

    const register = <K extends InvokeName>(name: K, handler: InvokeHandler<K>): void => {
      const channel = IPC_INVOKE_CHANNELS[name];
      ipcMain.removeHandler(channel);
      ipcMain.handle(channel, (event, payload: IpcInvokeRequestMap[K]) =>
        callbacks.runPromise(
          `ipc.${name}`,
          handler(payload, event).pipe(
            Effect.annotateLogs({
              channel,
              invoke: name,
              senderId: event.sender.id,
            }),
          ),
        ),
      );
    };

    register("deleteFileSystemItem", handlers.deleteFileSystemItem);
    register("enterFullscreen", handlers.enterFullscreen);
    register("exitFullscreen", handlers.exitFullscreen);
    register("getAllVideoFiles", handlers.getAllVideoFiles);
    register("getPlatform", handlers.getPlatform);
    register("getVideoMetadata", handlers.getVideoMetadata);
    register("readDirectory", handlers.readDirectory);
    register("readPersistedStore", handlers.readPersistedStore);
    register("removePersistedStore", handlers.removePersistedStore);
    register("renameFileSystemItem", handlers.renameFileSystemItem);
    register("selectFile", handlers.selectFile);
    register("selectFileOrFolder", handlers.selectFileOrFolder);
    register("selectFolder", handlers.selectFolder);
    register("showItemInFolder", handlers.showItemInFolder);
    register("writePersistedStore", handlers.writePersistedStore);

    yield* Effect.logDebug("IPC invoke handlers registered").pipe(
      Effect.annotateLogs({ handlerCount: Object.keys(handlers).length }),
    );

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const channel of Object.values(IPC_INVOKE_CHANNELS)) {
          ipcMain.removeHandler(channel);
        }
      }),
    );
  }),
);
