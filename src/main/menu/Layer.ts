import { platform } from "@electron-toolkit/utils";
import { Menu, app } from "electron";
import { Effect, Layer } from "effect";
import { LoggerService } from "../logging/Service";
import { MediaService } from "../media/Service";
import { RendererEventsService } from "../ipc/RendererEvents";
import { WindowService } from "../windows/Service";

export const MenuLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const logger = yield* LoggerService;
    const media = yield* MediaService;
    const windows = yield* WindowService;
    const rendererEvents = yield* RendererEventsService;

    const services = yield* Effect.services<
      LoggerService | MediaService | WindowService | RendererEventsService
    >();
    const runWithServices = Effect.runForkWith(services);

    const runMenuEffect = (effect: Effect.Effect<void, unknown, never>) => {
      runWithServices(
        effect.pipe(
          Effect.catch((error) => {
            logger.error("Menu action failed", error);
            return Effect.void;
          })
        )
      );
    };

    const macAppMenu: Electron.MenuItemConstructorOptions = {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Preferences",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            runMenuEffect(
              Effect.gen(function* () {
                const browserWindow = yield* windows.getOrCreateMainWindow;
                yield* rendererEvents.emit(browserWindow.webContents, "openSettings", undefined);
              })
            );
          }
        },
        { type: "separator" },
        { type: "normal", label: "Quit", role: "quit" }
      ]
    };

    const fileMenu: Electron.MenuItemConstructorOptions = {
      label: "File",
      submenu: [
        {
          label: "Open File",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            runMenuEffect(
              Effect.gen(function* () {
                const ret = yield* media.showFilePicker("file");
                if (!ret) return;

                const browserWindow = yield* windows.getOrCreateMainWindow;
                yield* rendererEvents.emit(browserWindow.webContents, "addFile", ret);
              })
            );
          }
        },
        {
          label: "Open Folder",
          accelerator: "CmdOrCtrl+Shift+O",
          click: () => {
            runMenuEffect(
              Effect.gen(function* () {
                const ret = yield* media.showFilePicker("folder");
                if (!ret) return;

                const browserWindow = yield* windows.getOrCreateMainWindow;
                yield* rendererEvents.emit(browserWindow.webContents, "addFolder", ret);
              })
            );
          }
        },
        { type: "separator" }
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

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        Menu.setApplicationMenu(null);
      })
    );
  })
);
