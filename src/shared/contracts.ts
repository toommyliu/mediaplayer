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

export interface VideoFileItem {
  duration?: number;
  name: string;
  path: string;
}
