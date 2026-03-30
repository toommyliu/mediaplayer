import type { Effect } from "effect";
import type { WebContents } from "electron";
import type { RendererEventPayloadMap } from "../../shared/ipc";
import { ServiceMap } from "effect";

export interface RendererEventsShape {
  emit: <K extends keyof RendererEventPayloadMap>(
    webContents: WebContents,
    eventName: K,
    payload: RendererEventPayloadMap[K],
  ) => Effect.Effect<void>;
}

export class RendererEventsService extends ServiceMap.Service<
  RendererEventsService,
  RendererEventsShape
>()("main/ipc/RendererEventsService") {}
