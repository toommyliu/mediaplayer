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

export type DirectoryContents = {
  currentPath: string;
  files: FileTreeItem[];
  isAtRoot: boolean;
  parentPath: string | null;
};

export type PlatformInfo = {
  isLinux: boolean;
  isMacOS: boolean;
  isWindows: boolean;
  pathSep: string;
};

export type VideoFileItem = {
  duration?: number;
  name: string;
  path: string;
};
