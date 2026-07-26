import { platform } from "@electron-toolkit/utils";
import { Effect, Layer } from "effect";
import { app, Menu } from "electron";
import { RendererEvents } from "../ipc/RendererEvents";
import { ElectronCallbacks } from "../runtime/ElectronCallbacks";
import { MediaPicker } from "./MediaPicker";
import { WindowManager } from "./WindowManager";

export const ApplicationMenuLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const callbacks = yield* ElectronCallbacks;
    const picker = yield* MediaPicker;
    const rendererEvents = yield* RendererEvents;
    const windows = yield* WindowManager;

    const run = (name: string, effect: Effect.Effect<void, unknown>): void =>
      callbacks.run(`menu.${name}`, effect);

    const macApplicationMenu: Electron.MenuItemConstructorOptions = {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Preferences",
          accelerator: "CmdOrCtrl+,",
          click: () =>
            run(
              "preferences",
              windows.getOrCreateFocused.pipe(
                Effect.flatMap((window) =>
                  rendererEvents.emit(window.webContents, "openSettings", undefined),
                ),
              ),
            ),
        },
        { type: "separator" },
        { label: "Quit", role: "quit", type: "normal" },
      ],
    };

    const fileMenu: Electron.MenuItemConstructorOptions = {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => run("new-window", windows.create.pipe(Effect.asVoid)),
        },
        { type: "separator" },
        {
          label: "Open File",
          accelerator: "CmdOrCtrl+O",
          click: () =>
            run(
              "open-file",
              Effect.gen(function* () {
                const window = yield* windows.getOrCreateFocused;
                const result = yield* picker.show("file", window);
                if (result) {
                  yield* rendererEvents.emit(window.webContents, "addFile", result);
                }
              }),
            ),
        },
        {
          label: "Open Folder",
          accelerator: "CmdOrCtrl+Shift+O",
          click: () =>
            run(
              "open-folder",
              Effect.gen(function* () {
                const window = yield* windows.getOrCreateFocused;
                const result = yield* picker.show("folder", window);
                if (result) {
                  yield* rendererEvents.emit(window.webContents, "addFolder", result);
                }
              }),
            ),
        },
        { type: "separator" },
      ],
    };

    const menu = Menu.buildFromTemplate([
      ...(platform.isMacOS ? [macApplicationMenu] : []),
      fileMenu,
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]);
    Menu.setApplicationMenu(menu);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        Menu.setApplicationMenu(null);
      }),
    );
  }),
);
