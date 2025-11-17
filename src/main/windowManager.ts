import { EventEmitter } from "node:events";
import { BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { is, platform } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";

const emitter = new EventEmitter();

let mainWindow: BrowserWindow | null = null;

function attachWindowEventListeners(window: BrowserWindow) {
  window.on("ready-to-show", () => emitter.emit("ready-to-show", window));
  window.on("show", () => emitter.emit("show", window));
  window.on("close", (event) => {
    // On macOS, we hide the window instead of closing it
    if (platform.isMacOS) {
      event.preventDefault();
      window.hide();
      return;
    }

    emitter.emit("close", event, window);
  });
  window.on("closed", () => emitter.emit("closed"));
  window.on("focus", () => emitter.emit("focus"));
  window.on("blur", () => emitter.emit("blur"));
}

function detachWindowEventListeners(window: BrowserWindow) {
  window.removeAllListeners("ready-to-show");
  window.removeAllListeners("show");
  window.removeAllListeners("close");
  window.removeAllListeners("closed");
  window.removeAllListeners("focus");
  window.removeAllListeners("blur");
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getOrCreateMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (platform.isMacOS && !mainWindow.isVisible()) mainWindow.show();
    return mainWindow;
  }

  return create();
}

export function create(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  const window = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(platform.isLinux ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webSecurity: false,
      contextIsolation: true
    }
  });

  mainWindow = window;

  attachWindowEventListeners(window);

  window.on("ready-to-show", () => {
    window.show();
    window.maximize();

    if (is.dev) {
      window.webContents.openDevTools({
        mode: "right"
      });
    }
  });

  window.on("closed", () => {
    detachWindowEventListeners(window);
    mainWindow = null;
  });

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}

export function setFullScreen(flag: boolean): void {
  const w = getMainWindow();
  if (!w) return;
  w.setFullScreen(flag);
}

export function show(): void {
  const w = getMainWindow();
  if (!w) return;
  w.show();
}

export function hide(): void {
  const w = getMainWindow();
  if (!w) return;
  w.hide();
}

export function destroy(): void {
  if (!mainWindow) return;
  try {
    detachWindowEventListeners(mainWindow);
    mainWindow.removeAllListeners("close");
    if (!mainWindow.isDestroyed()) mainWindow.destroy();
  } finally {
    mainWindow = null;
  }
}

export const on = (event: string | symbol, fn: (...args: any[]) => void) => emitter.on(event, fn);
export const once = (event: string | symbol, fn: (...args: any[]) => void) => emitter.once(event, fn);
export const off = (event: string | symbol, fn?: (...args: any[]) => void) => emitter.off(event, fn);

export const isCreated = () => !!mainWindow && !mainWindow.isDestroyed();

export default {
  create,
  getMainWindow,
  getOrCreateMainWindow,
  setFullScreen,
  show,
  hide,
  destroy,
  on,
  off,
  once,
  isCreated
};
