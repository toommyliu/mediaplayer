import type { FileTreeItem } from "../shared";

export type PickerResult =
  | {
      path: string;
      type: "file";
    }
  | {
      rootPath: string;
      tree: FileTreeItem[];
      type: "folder";
    };

export interface DirectoryContents {
  currentPath: string;
  files: FileTreeItem[];
  isAtRoot: boolean;
  parentPath: string | null;
}

export interface PlatformInfo {
  isLinux: boolean;
  isMacOS: boolean;
  isWindows: boolean;
  pathSep: string;
}

export interface RenameFileSystemItemInput {
  newName: string;
  path: string;
}

export interface RenameFileSystemItemResult {
  name: string;
  newPath: string;
  oldPath: string;
}

export interface VideoFileItem {
  duration?: number;
  name: string;
  path: string;
}

export interface VideoMetadata {
  audio?: {
    bitrateBitsPerSecond?: number;
    channelLayout?: string;
    channels?: number;
    codecLongName?: string;
    codecName?: string;
    sampleRateHz?: number;
  };
  file: {
    extension: string;
    modifiedAtMs: number;
    name: string;
    path: string;
    sizeBytes: number;
  };
  format?: {
    bitrateBitsPerSecond?: number;
    durationSeconds?: number;
    formatName?: string;
  };
  probeError?: string;
  video?: {
    bitrateBitsPerSecond?: number;
    codecLongName?: string;
    codecName?: string;
    displayAspectRatio?: string;
    frameRate?: number;
    height?: number;
    width?: number;
  };
}

export interface Bookmark {
  createdAt: number;
  id: string;
  label?: string;
  timestamp: number;
  videoPath: string;
}
