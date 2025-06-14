import { createClient } from "@egoist/tipc/renderer";
import type { Router } from "../../main/tipc";
import { createEventHandlers } from "@egoist/tipc/renderer";
import type { RendererHandlers } from "../../main/tipc";

export const client = createClient<Router>({
  ipcInvoke: window.electron.ipcRenderer.invoke
});

export const handlers = createEventHandlers<RendererHandlers>({
  on: (channel, callback) => window.electron.ipcRenderer.on(channel, callback),
  send: window.electron.ipcRenderer.send
});
