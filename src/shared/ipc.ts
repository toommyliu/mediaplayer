import type {
  DirectoryContents,
  PickerResult,
  PlatformInfo,
  VideoFileItem,
} from "./contracts";

export interface IpcInvokeRequestMap {
  enterFullscreen: undefined;
  exitFullscreen: undefined;
  getAllVideoFiles: string;
  getPlatform: undefined;
  readPersistedStore: string;
  readDirectory: string;
  removePersistedStore: string;
  selectFile: undefined;
  selectFileOrFolder: undefined;
  selectFolder: undefined;
  showItemInFolder: string;
  writePersistedStore: {
    name: string;
    value: string;
  };
}

export interface IpcInvokeResponseMap {
  enterFullscreen: void;
  exitFullscreen: void;
  getAllVideoFiles: VideoFileItem[];
  getPlatform: PlatformInfo;
  readPersistedStore: string | null;
  readDirectory: DirectoryContents;
  removePersistedStore: void;
  selectFile: PickerResult | null;
  selectFileOrFolder: PickerResult | null;
  selectFolder: PickerResult | null;
  showItemInFolder: void;
  writePersistedStore: void;
}

export interface RendererEventPayloadMap {
  addFile: PickerResult;
  addFolder: PickerResult;
  mediaNextTrack: undefined;
  mediaPlayPause: undefined;
  mediaPreviousTrack: undefined;
  openSettings: undefined;
  windowBlur: undefined;
  windowFocus: undefined;
  windowFullscreenEnter: undefined;
  windowFullscreenExit: undefined;
}

export const IPC_INVOKE_CHANNELS = {
  enterFullscreen: "mediaplayer:invoke:enterFullscreen",
  exitFullscreen: "mediaplayer:invoke:exitFullscreen",
  getAllVideoFiles: "mediaplayer:invoke:getAllVideoFiles",
  getPlatform: "mediaplayer:invoke:getPlatform",
  readPersistedStore: "mediaplayer:invoke:readPersistedStore",
  readDirectory: "mediaplayer:invoke:readDirectory",
  removePersistedStore: "mediaplayer:invoke:removePersistedStore",
  selectFile: "mediaplayer:invoke:selectFile",
  selectFileOrFolder: "mediaplayer:invoke:selectFileOrFolder",
  selectFolder: "mediaplayer:invoke:selectFolder",
  showItemInFolder: "mediaplayer:invoke:showItemInFolder",
  writePersistedStore: "mediaplayer:invoke:writePersistedStore",
} as const satisfies Record<keyof IpcInvokeRequestMap, string>;

export const IPC_EVENT_CHANNELS = {
  addFile: "mediaplayer:event:addFile",
  addFolder: "mediaplayer:event:addFolder",
  mediaNextTrack: "mediaplayer:event:mediaNextTrack",
  mediaPlayPause: "mediaplayer:event:mediaPlayPause",
  mediaPreviousTrack: "mediaplayer:event:mediaPreviousTrack",
  openSettings: "mediaplayer:event:openSettings",
  windowBlur: "mediaplayer:event:windowBlur",
  windowFocus: "mediaplayer:event:windowFocus",
  windowFullscreenEnter: "mediaplayer:event:windowFullscreenEnter",
  windowFullscreenExit: "mediaplayer:event:windowFullscreenExit",
} as const satisfies Record<keyof RendererEventPayloadMap, string>;
