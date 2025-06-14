import { app, BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import { VIDEO_EXTENSIONS } from "./constants";
import { readdir, stat } from "node:fs/promises";
import { extname, join, dirname, resolve } from "node:path";
import { chmod } from "node:fs/promises";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
import { promisify } from "node:util";
import { logger } from "./logger";

const ffprobeAsync = promisify(ffmpeg.ffprobe);
let isFfmpegInitialized = false;

// The previous dialog path
let previousPath: string | null = null;

async function doFfmpegInit(): Promise<void> {
  if (isFfmpegInitialized) return;

  logger.debug("initializing ffmpeg and ffprobe");

  try {
    const stats = await stat(ffmpegInstaller.path);
    const isExecutable = stats.mode & 0o111;

    if (stats.isFile()) {
      if (!isExecutable) {
        await chmod(ffmpegInstaller.path, 0o755);
        logger.debug("fixed permissions for ffmpeg");
      } else {
        logger.debug("ffmpeg already has execute permissions");
      }
    }
  } catch (error) {
    logger.error(error, "Could not check/fix ffmpeg permissions");
  }

  try {
    const stats = await stat(ffprobeInstaller.path);
    const isExecutable = stats.mode & 0o111;

    if (stats.isFile()) {
      if (!isExecutable) {
        await chmod(ffprobeInstaller.path, 0o755);
        logger.debug("fixed permissions for ffprobe");
      } else {
        logger.debug("ffprobe already has execute permissions");
      }
    }
  } catch (error) {
    logger.error(error, "Could not check/fix ffprobe permissions");
  }

  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  ffmpeg.setFfprobePath(ffprobeInstaller.path);

  isFfmpegInitialized = true;
}

/**
 * Get the duration of a video file.
 *
 * @param filePath - The path to the video file.
 *
 * @returns The video duration in seconds.
 */
export async function getVideoDuration(filePath: string): Promise<number> {
  await doFfmpegInit();

  try {
    const metadata = (await ffprobeAsync(filePath)) as FfmpegProbeMetadata;
    const duration = metadata.format?.duration || 0;
    return duration;
  } catch (error) {
    logger.error(error, `Error getting video duration for ${filePath}`);
    return 0;
  }
}

/**
 * Shows the file picker.
 *
 * @param mode - The mode of the file browser, used to specify the entry types allowed.
 */
export async function showFilePicker(mode: "file"): Promise<PickerResult | null>;
export async function showFilePicker(mode: "folder"): Promise<PickerResult | null>;
export async function showFilePicker(mode: "both"): Promise<PickerResult | null>;
export async function showFilePicker(
  mode: "file" | "folder" | "both"
): Promise<string | PickerResult | null> {
  const properties: Array<"openFile" | "openDirectory" | "multiSelections" | "createDirectory"> =
    [];

  if (mode === "file") {
    properties.push("openFile", "multiSelections");
  } else if (mode === "folder") {
    properties.push("openDirectory");
  } else if (mode === "both") {
    properties.push("openFile", "openDirectory", "multiSelections");
  }

  const options: OpenDialogOptions = {
    defaultPath: previousPath || app.getPath("downloads"),
    properties,
    title: `Select ${mode === "file" ? "File" : mode === "folder" ? "Folder" : "File or Folder"}`,
    message: `Select ${mode === "file" ? "a file" : mode === "folder" ? "a folder" : "a file or folder"} to open`
  };

  if (mode === "file" || mode === "both") {
    options.filters = [
      { name: "Video Files", extensions: VIDEO_EXTENSIONS },
      { name: "All Files", extensions: ["*"] }
    ];
  }

  const filePaths = dialog.showOpenDialogSync(BrowserWindow.getFocusedWindow()!, options);
  if (!filePaths || filePaths.length === 0) return null;

  try {
    if (mode === "file") {
      previousPath = dirname(filePaths[0]);
      logger.debug(`previousPath set to: ${previousPath}`);
      return {
        type: "file",
        path: filePaths[0]
      };
    } else if (mode === "folder" || mode === "both") {
      const selectedPath = filePaths[0];
      const stats = await stat(selectedPath);
      if (stats.isFile()) {
        previousPath = dirname(selectedPath);
        logger.debug(`previousPath set to: ${previousPath}`);
        return {
          type: "file",
          path: selectedPath
        };
      } else if (stats.isDirectory()) {
        previousPath = selectedPath;
        logger.debug(`previousPath set to: ${previousPath}`);
        return await buildFileTree(selectedPath);
      }
    }

    return null;
  } catch (error) {
    logger.error(error, "Error showing file picker");
    return null;
  }
}

async function buildFileTree(dirPath: string): Promise<PickerResult> {
  await doFfmpegInit();

  const rootPath = dirPath;
  const ret: PickerResult = {
    type: "folder",
    rootPath,
    tree: []
  };

  for (const entry of await readdir(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      const subDirPath = join(dirPath, entry.name);
      const subTree = await buildFileTree(subDirPath);
      ret.tree.push({
        path: subDirPath,
        name: entry.name,
        files: subTree.type === "folder" ? subTree.tree : [],
        type: "folder"
      });
    } else {
      const filePath = join(dirPath, entry.name);
      if (VIDEO_EXTENSIONS.some((ext) => extname(filePath).toLowerCase() === `.${ext}`)) {
        ret.tree.push({
          path: filePath,
          name: entry.name,
          type: "video",
          duration: await getVideoDuration(filePath)
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

    const parentPath = dirname(resolvedPath);
    const isAtRoot = resolvedPath === parentPath;

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(resolvedPath, entry.name);

      if (entry.isDirectory()) {
        files.push({
          name: entry.name,
          path: fullPath,
          type: "folder",
          files: await loadDirectoryContents(fullPath).then((contents) => contents.files)
        });
      } else if (VIDEO_EXTENSIONS.some((ext) => extname(fullPath).toLowerCase() === `.${ext}`)) {
        const duration = await getVideoDuration(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          type: "video",
          duration
        });
      }
    }

    // Folders first
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
    logger.error(error, "Error loading directory contents");
    throw error;
  }
}

export type PickerResult =
  | {
      type: "file";
      path: string;
    }
  | {
      type: "folder";
      rootPath: string;
      tree: PickerNode[];
    };

export type PickerNode = {
  path?: string;
  name?: string;
} & (
  | {
      type: "video";
      duration: number;
    }
  | {
      type: "folder";
      files: PickerNode[];
    }
);

export type FileItem = {
  name: string;
  path: string;
} & (
  | {
      type: "video";
      duration: number;
    }
  | {
      type: "folder";
      files: FileItem[];
    }
);

export type DirectoryContents = {
  currentPath: string;
  parentPath: string | null;
  isAtRoot: boolean;
  files: FileItem[];
};

type FfmpegProbeMetadata = {
  format: {
    filename: string;
    duration: number;
  };
};
