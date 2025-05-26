import { app, dialog } from "electron";
import { VIDEO_EXTENSIONS } from "./constants";
import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

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
    console.log("res.filePaths[0]:", res.filePaths[0]);

    if (mode === "file") {
      return res.filePaths[0];
    } else if (mode === "folder" || mode === "both") {
      const ret = await buildFileTree(res.filePaths[0]);
      console.log("file tree:", ret);

      return ret;
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

type FileNode = {
  path?: string;
  name?: string;
  files?: FileNode[];
};

type FileTree = {
  rootPath: string;
  files: FileNode[];
};
