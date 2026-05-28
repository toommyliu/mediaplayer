import type {
  DirectoryContents,
  PickerResult,
  PlatformInfo,
  RenameFileSystemItemInput,
  RenameFileSystemItemResult,
  VideoFileItem,
  VideoMetadata,
} from "./contracts";

export interface IpcInvokeRequestMap {
  enterFullscreen: undefined;
  exitFullscreen: undefined;
  getAllVideoFiles: string;
  getPlatform: undefined;
  getVideoMetadata: string;
  readPersistedStore: string;
  readDirectory: string;
  removePersistedStore: string;
  renameFileSystemItem: RenameFileSystemItemInput;
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
  getVideoMetadata: VideoMetadata;
  readPersistedStore: string | null;
  readDirectory: DirectoryContents;
  removePersistedStore: void;
  renameFileSystemItem: RenameFileSystemItemResult;
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
  getVideoMetadata: "mediaplayer:invoke:getVideoMetadata",
  readPersistedStore: "mediaplayer:invoke:readPersistedStore",
  readDirectory: "mediaplayer:invoke:readDirectory",
  removePersistedStore: "mediaplayer:invoke:removePersistedStore",
  renameFileSystemItem: "mediaplayer:invoke:renameFileSystemItem",
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
