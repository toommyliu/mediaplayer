import type { DirectoryContents, PickerResult, PlatformInfo, VideoFileItem } from "@/lib/contracts";
import {
  IPC_EVENT_CHANNELS,
  IPC_INVOKE_CHANNELS,
  type RendererEventPayloadMap
} from "../../../common/ipc";

function onRendererEvent<K extends keyof RendererEventPayloadMap>(
  eventName: K,
  listener: (payload: RendererEventPayloadMap[K]) => void
): () => void {
  return window.electron.ipcRenderer.on(IPC_EVENT_CHANNELS[eventName], (_event, payload) => {
    listener(payload as RendererEventPayloadMap[K]);
  });
}

export function enterFullscreen(): Promise<void> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.enterFullscreen, undefined);
}

export function exitFullscreen(): Promise<void> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.exitFullscreen, undefined);
}

export function getAllVideoFiles(path: string): Promise<VideoFileItem[]> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.getAllVideoFiles, path);
}

export function getPlatform(): Promise<PlatformInfo> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.getPlatform, undefined);
}

export function readDirectory(path: string): Promise<DirectoryContents> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.readDirectory, path);
}

export function selectFileOrFolder(): Promise<PickerResult | null> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.selectFileOrFolder, undefined);
}

export function showItemInFolder(path: string): Promise<void> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.showItemInFolder, path);
}

export function onAddFile(listener: (result: PickerResult) => void): () => void {
  return onRendererEvent("addFile", listener);
}

export function onAddFolder(listener: (result: PickerResult) => void): () => void {
  return onRendererEvent("addFolder", listener);
}

export function onMediaNextTrack(listener: () => void): () => void {
  return onRendererEvent("mediaNextTrack", () => listener());
}

export function onMediaPlayPause(listener: () => void): () => void {
  return onRendererEvent("mediaPlayPause", () => listener());
}

export function onMediaPreviousTrack(listener: () => void): () => void {
  return onRendererEvent("mediaPreviousTrack", () => listener());
}

export function onOpenSettings(listener: () => void): () => void {
  return onRendererEvent("openSettings", () => listener());
}
