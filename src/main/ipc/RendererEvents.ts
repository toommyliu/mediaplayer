import type { WebContents } from "electron";
import type { RendererEventPayloadMap } from "../../shared/ipc";
import { Context, Effect, Layer } from "effect";
import { IPC_EVENT_CHANNELS } from "../../shared/ipc";

export interface RendererEventsShape {
  readonly emit: <K extends keyof RendererEventPayloadMap>(
    webContents: WebContents,
    eventName: K,
    payload: RendererEventPayloadMap[K],
  ) => Effect.Effect<void>;
}

export class RendererEvents extends Context.Service<RendererEvents, RendererEventsShape>()(
  "mediaplayer/main/ipc/RendererEvents",
) {
  static readonly layer = Layer.succeed(RendererEvents)({
    emit: (webContents, eventName, payload) =>
      Effect.try(() => {
        if (!webContents.isDestroyed()) {
          webContents.send(IPC_EVENT_CHANNELS[eventName], payload);
        }
      }).pipe(
        Effect.catch((error) =>
          Effect.logError("Failed to emit renderer event", error).pipe(
            Effect.annotateLogs({ eventName }),
          ),
        ),
      ),
  });
}
