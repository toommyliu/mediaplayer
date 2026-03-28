import { createClient, createEventHandlers } from "@egoist/tipc/renderer";
import type {
  DirectoryContents,
  PickerResult,
  PlatformInfo,
  RendererEventMap
} from "@/lib/contracts";

const rawClient = createClient<any>({
  ipcInvoke: window.electron.ipcRenderer.invoke
});

const rawHandlers = createEventHandlers<any>({
  on: (channel, callback) => window.electron.ipcRenderer.on(channel, callback),
  send: window.electron.ipcRenderer.send
});

export const client = {
  enterFullscreen(): Promise<void> {
    return (rawClient as any).enterFullscreen(undefined);
  },
  exitFullscreen(): Promise<void> {
    return (rawClient as any).exitFullscreen(undefined);
  },
  getAllVideoFiles(path: string): Promise<Array<{ duration?: number; name: string; path: string }>> {
    return (rawClient as any).getAllVideoFiles(path);
  },
  getPlatform(): Promise<PlatformInfo> {
    return (rawClient as any).getPlatform(undefined);
  },
  readDirectory(path: string): Promise<DirectoryContents> {
    return (rawClient as any).readDirectory(path);
  },
  selectFileOrFolder(): Promise<PickerResult | null> {
    return (rawClient as any).selectFileOrFolder(undefined);
  },
  showItemInFolder(path: string): Promise<void> {
    return (rawClient as any).showItemInFolder(path);
  }
};

export const handlers: {
  [K in keyof RendererEventMap]: {
    listen: (listener: RendererEventMap[K]) => () => void;
  };
} = {
  addFile: {
    listen(listener) {
      (rawHandlers as any).addFile.listen(listener);
      return () => undefined;
    }
  },
  addFolder: {
    listen(listener) {
      (rawHandlers as any).addFolder.listen(listener);
      return () => undefined;
    }
  },
  mediaNextTrack: {
    listen(listener) {
      (rawHandlers as any).mediaNextTrack.listen(listener);
      return () => undefined;
    }
  },
  mediaPlayPause: {
    listen(listener) {
      (rawHandlers as any).mediaPlayPause.listen(listener);
      return () => undefined;
    }
  },
  mediaPreviousTrack: {
    listen(listener) {
      (rawHandlers as any).mediaPreviousTrack.listen(listener);
      return () => undefined;
    }
  },
  openSettings: {
    listen(listener) {
      (rawHandlers as any).openSettings.listen(listener);
      return () => undefined;
    }
  }
};
