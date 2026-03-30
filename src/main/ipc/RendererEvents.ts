import type { WebContents } from "electron";
import { Effect, ServiceMap } from "effect";
import type { RendererEventPayloadMap } from "../../shared/ipc";

export type RendererEventsShape = {
  emit: <K extends keyof RendererEventPayloadMap>(
    webContents: WebContents,
    eventName: K,
    payload: RendererEventPayloadMap[K]
  ) => Effect.Effect<void>;
};

export class RendererEventsService extends ServiceMap.Service<
  RendererEventsService,
  RendererEventsShape
>()("main/ipc/RendererEventsService") {}
