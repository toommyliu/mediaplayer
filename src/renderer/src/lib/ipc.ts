import type { RendererEventPayloadMap } from "../../../shared/ipc";
import type {
  DirectoryContents,
  PickerResult,
  PlatformInfo,
  RenameFileSystemItemInput,
  RenameFileSystemItemResult,
  VideoFileItem,
  VideoMetadata,
} from "@/lib/contracts";
import { IPC_EVENT_CHANNELS, IPC_INVOKE_CHANNELS } from "../../../shared/ipc";

function onRendererEvent<K extends keyof RendererEventPayloadMap>(
  eventName: K,
  listener: (payload: RendererEventPayloadMap[K]) => void,
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

export function getVideoMetadata(path: string): Promise<VideoMetadata> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.getVideoMetadata, path);
}

export function readPersistedStore(name: string): Promise<string | null> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.readPersistedStore, name);
}

export function readDirectory(path: string): Promise<DirectoryContents> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.readDirectory, path);
}

export function deleteFileSystemItem(path: string): Promise<void> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.deleteFileSystemItem, path);
}

export function removePersistedStore(name: string): Promise<void> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.removePersistedStore, name);
}

export function renameFileSystemItem(
  input: RenameFileSystemItemInput,
): Promise<RenameFileSystemItemResult> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.renameFileSystemItem, input);
}

export function selectFileOrFolder(): Promise<PickerResult | null> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.selectFileOrFolder, undefined);
}

export function showItemInFolder(path: string): Promise<void> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.showItemInFolder, path);
}

export function writePersistedStore(name: string, value: string): Promise<void> {
  return window.electron.ipcRenderer.invoke(IPC_INVOKE_CHANNELS.writePersistedStore, {
    name,
    value,
  });
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

export function onWindowBlur(listener: () => void): () => void {
  return onRendererEvent("windowBlur", () => listener());
}

export function onWindowFocus(listener: () => void): () => void {
  return onRendererEvent("windowFocus", () => listener());
}

export function onWindowFullscreenEnter(listener: () => void): () => void {
  return onRendererEvent("windowFullscreenEnter", () => listener());
}

export function onWindowFullscreenExit(listener: () => void): () => void {
  return onRendererEvent("windowFullscreenExit", () => listener());
}
