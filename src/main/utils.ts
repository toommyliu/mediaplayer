import { app, dialog } from "electron";
import { VIDEO_EXTENSIONS } from "./constants";
import { readdir, stat } from "node:fs/promises";
import { extname, join, dirname, resolve } from "node:path";

/**
 * Shows the file picker.
 *
 * @param mode - The mode of the file browser, used to specify the entry types allowed.
 */
export async function showFilePicker(mode: "file"): Promise<string | null>;
export async function showFilePicker(mode: "folder"): Promise<FileTree | null>;
export async function showFilePicker(mode: "both"): Promise<FileTree | null>;
export async function showFilePicker(
  mode: "file" | "folder" | "both"
): Promise<string | FileTree | null> {
  const properties: Array<"openFile" | "openDirectory" | "multiSelections" | "createDirectory"> =
    [];

  if (mode === "file") {
    properties.push("openFile", "multiSelections");
  } else if (mode === "folder") {
    properties.push("openDirectory");
  } else if (mode === "both") {
    properties.push("openFile", "openDirectory", "multiSelections");
  }

  const options: Electron.OpenDialogOptions = {
    defaultPath: app.getPath("downloads"),
    properties
  };

  if (mode === "file" || mode === "both") {
    options.filters = [
      { name: "Video Files", extensions: VIDEO_EXTENSIONS },
      { name: "All Files", extensions: ["*"] }
    ];
  }

  const res = await dialog.showOpenDialog(options);

  if (res.canceled || res.filePaths.length === 0) {
    return null;
  }

  try {
    if (mode === "file") {
      return res.filePaths[0];
    } else if (mode === "folder" || mode === "both") {
      const selectedPath = res.filePaths[0];
      const stats = await stat(selectedPath);

      if (stats.isDirectory()) {
        const ret = await buildFileTree(selectedPath);
        console.log("file tree:", ret);
        return ret;
      } else {
        const parentDir = dirname(selectedPath);
        const ret = await buildFileTree(parentDir);
        console.log("file tree:", ret);
        return ret;
      }
    }

    return null;
  } catch (error) {
    console.error("Error building folder structure:", error);
    return null;
  }
}

async function buildFileTree(dirPath: string): Promise<FileTree> {
  const rootPath = dirPath;
  const ret: FileTree = {
    rootPath,
    files: []
  };

  for (const entry of await readdir(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      const subDirPath = join(dirPath, entry.name);
      const subTree = await buildFileTree(subDirPath);
      ret.files.push({
        path: subDirPath,
        files: subTree.files
      });
    } else {
      const filePath = join(dirPath, entry.name);
      if (VIDEO_EXTENSIONS.some((ext) => extname(filePath).toLowerCase() === `.${ext}`)) {
        ret.files.push({
          path: filePath,
          name: entry.name
        });
      }
    }
  }

  return ret;
}

export async function loadDirectoryContents(dirPath: string): Promise<DirectoryContents> {
  try {
    const resolvedPath = resolve(dirPath);
    const entries = await readdir(resolvedPath, { withFileTypes: true });
    const files: FileItem[] = [];

    // Check if we're at the root by trying to go up one level
    const parentPath = dirname(resolvedPath);
    const isAtRoot = resolvedPath === parentPath;

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(resolvedPath, entry.name);

      if (entry.isDirectory()) {
        files.push({
          name: entry.name,
          path: fullPath,
          type: "folder"
        });
      } else if (VIDEO_EXTENSIONS.some((ext) => extname(fullPath).toLowerCase() === `.${ext}`)) {
        const stats = await stat(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          type: "video",
          size: stats.size
        });
      }
    }

    // Sort: folders first, then files, both alphabetically
    files.sort((a, b) => {
      if (a.type === "folder" && b.type === "video") return -1;
      if (a.type === "video" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      currentPath: resolvedPath,
      parentPath: isAtRoot ? null : parentPath,
      isAtRoot,
      files
    };
  } catch (error) {
    console.error("Error loading directory:", error);
    throw error;
  }
}

export type FileNode = {
  path?: string;
  name?: string;
  files?: FileNode[];
};

export type FileTree = {
  rootPath: string;
  files: FileNode[];
};

export type FileItem = {
  name: string;
  path: string;
  type: "folder" | "video";
  size?: number;
  duration?: number;
};

export type DirectoryContents = {
  currentPath: string;
  parentPath: string | null;
  isAtRoot: boolean;
  files: FileItem[];
};
