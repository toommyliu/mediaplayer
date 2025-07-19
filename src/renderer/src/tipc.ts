import { createClient, createEventHandlers } from "@egoist/tipc/renderer";
import type { Router, RendererHandlers } from "$main/tipc";

export const client = createClient<Router>({
  // eslint-disable-next-line @typescript-eslint/unbound-method
  ipcInvoke: window.electron.ipcRenderer.invoke
});

export const handlers = createEventHandlers<RendererHandlers>({
  // eslint-disable-next-line promise/prefer-await-to-callbacks
  on: (channel, callback) => window.electron.ipcRenderer.on(channel, callback),
  // eslint-disable-next-line @typescript-eslint/unbound-method
  send: window.electron.ipcRenderer.send
});
