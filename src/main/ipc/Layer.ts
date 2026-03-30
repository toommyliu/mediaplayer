import { ipcMain } from "electron";
import { Effect, Layer } from "effect";
import { IPC_EVENT_CHANNELS } from "../../shared/ipc";
import { RendererEventsService } from "./RendererEvents";

export const RendererEventsLayer = Layer.succeed(RendererEventsService)({
  emit: (webContents, eventName, payload) =>
    Effect.sync(() => {
      webContents.send(IPC_EVENT_CHANNELS[eventName], payload);
    })
});

export const IpcMainResetLayer = Layer.effectDiscard(
  Effect.sync(() => {
    return () => {
      for (const channel of Object.values(IPC_EVENT_CHANNELS)) {
        ipcMain.removeAllListeners(channel);
      }
    };
  }).pipe(
    Effect.flatMap((cleanup) =>
      Effect.addFinalizer(() =>
        Effect.sync(() => {
          cleanup();
        })
      )
    )
  )
);
