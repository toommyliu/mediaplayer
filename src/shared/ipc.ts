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
  readDirectory: string;
  selectFile: undefined;
  selectFileOrFolder: undefined;
  selectFolder: undefined;
  showItemInFolder: string;
}

export interface IpcInvokeResponseMap {
  enterFullscreen: void;
  exitFullscreen: void;
  getAllVideoFiles: VideoFileItem[];
  getPlatform: PlatformInfo;
  readDirectory: DirectoryContents;
  selectFile: PickerResult | null;
  selectFileOrFolder: PickerResult | null;
  selectFolder: PickerResult | null;
  showItemInFolder: void;
}

export interface RendererEventPayloadMap {
  addFile: PickerResult;
  addFolder: PickerResult;
  mediaNextTrack: undefined;
  mediaPlayPause: undefined;
  mediaPreviousTrack: undefined;
  openSettings: undefined;
  windowFullscreenEnter: undefined;
  windowFullscreenExit: undefined;
}

export const IPC_INVOKE_CHANNELS = {
  enterFullscreen: "mediaplayer:invoke:enterFullscreen",
  exitFullscreen: "mediaplayer:invoke:exitFullscreen",
  getAllVideoFiles: "mediaplayer:invoke:getAllVideoFiles",
  getPlatform: "mediaplayer:invoke:getPlatform",
  readDirectory: "mediaplayer:invoke:readDirectory",
  selectFile: "mediaplayer:invoke:selectFile",
  selectFileOrFolder: "mediaplayer:invoke:selectFileOrFolder",
  selectFolder: "mediaplayer:invoke:selectFolder",
  showItemInFolder: "mediaplayer:invoke:showItemInFolder",
} as const satisfies Record<keyof IpcInvokeRequestMap, string>;

export const IPC_EVENT_CHANNELS = {
  addFile: "mediaplayer:event:addFile",
  addFolder: "mediaplayer:event:addFolder",
  mediaNextTrack: "mediaplayer:event:mediaNextTrack",
  mediaPlayPause: "mediaplayer:event:mediaPlayPause",
  mediaPreviousTrack: "mediaplayer:event:mediaPreviousTrack",
  openSettings: "mediaplayer:event:openSettings",
  windowFullscreenEnter: "mediaplayer:event:windowFullscreenEnter",
  windowFullscreenExit: "mediaplayer:event:windowFullscreenExit",
} as const satisfies Record<keyof RendererEventPayloadMap, string>;
