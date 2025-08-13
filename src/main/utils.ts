import { chmod, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { app, BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "./logger";
import {
  VIDEO_EXTENSIONS,
  buildSortedFileTree,
  isVideoFile,
  createFileTreeItem,
  DEFAULT_SORT_OPTIONS,
  sortFileTreeRecursive,
  type FileTreeItem,
  type SortOptions
} from "../shared";

const makeFilePath = (path: string): string => path;

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
      if (isExecutable) {
        logger.debug("ffmpeg already has execute permissions");
      } else {
        logger.debug("ffmpeg does not have execute permissions, fixing...");
        await chmod(ffmpegInstaller.path, 0o755);
      }
    }
  } catch (error) {
    logger.error(error, "Could not check/fix ffmpeg permissions");
  }

  try {
    const stats = await stat(ffprobeInstaller.path);
    const isExecutable = stats.mode & 0o111;

    if (stats.isFile()) {
      if (isExecutable) {
        logger.debug("ffprobe already has execute permissions");
      } else {
        logger.debug("ffprobe does not have execute permissions, fixing...");
        await chmod(ffprobeInstaller.path, 0o755);
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
 * @returns The video duration in seconds.
 */
export async function getVideoDuration(filePath: string): Promise<number> {
  await doFfmpegInit();

  try {
    const metadata = (await ffprobeAsync(filePath)) as FfmpegProbeMetadata;
    return metadata.format?.duration || 0;
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
export async function showFilePicker(
  mode: "both" | "file" | "folder"
): Promise<PickerResult | null> {
  const properties: ("createDirectory" | "multiSelections" | "openDirectory" | "openFile")[] = [];

  if (mode === "file") {
    properties.push("openFile", "multiSelections");
  } else if (mode === "folder") {
    properties.push("openDirectory");
  } else if (mode === "both") {
    properties.push("openFile", "openDirectory", "multiSelections");
  }

  const options: OpenDialogOptions = {
    defaultPath: previousPath ?? app.getPath("downloads"),
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

  // eslint-disable-next-line n/no-sync
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
          path: makeFilePath(selectedPath)
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

async function buildFileTree(
  dirPath: string,
  sortOptions: SortOptions = DEFAULT_SORT_OPTIONS
): Promise<PickerResult> {
  await doFfmpegInit();

  const rootPath = dirPath;
  const ret: PickerResult = {
    type: "folder",
    rootPath,
    tree: []
  };

  const entries: {
    duration?: number;
    files?: FileTreeItem[];
    name: string;
    path: string;
    type: "folder" | "video";
  }[] = [];

  for (const entry of await readdir(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      const subDirPath = join(dirPath, entry.name);
      const subTree = await buildFileTree(subDirPath, sortOptions);
      entries.push({
        path: subDirPath,
        name: entry.name,
        type: "folder",
        files: subTree.type === "folder" ? subTree.tree : []
      });
    } else {
      const filePath = join(dirPath, entry.name);
      if (isVideoFile(entry.name)) {
        const duration = await getVideoDuration(filePath);
        entries.push({
          path: makeFilePath(filePath),
          name: entry.name,
          type: "video",
          duration
        });
      }
    }
  }

  // Use shared sorting utilities to sort the entries
  ret.tree = buildSortedFileTree(entries, sortOptions);

  return ret;
}

export async function loadDirectoryContents(
  dirPath: string,
  sortOptions: SortOptions = DEFAULT_SORT_OPTIONS
): Promise<DirectoryContents> {
  try {
    const resolvedPath = resolve(dirPath);
    const entries = await readdir(resolvedPath, { withFileTypes: true });

    const parentPath = dirname(resolvedPath);
    const isAtRoot = resolvedPath === parentPath;

    const rawEntries: {
      duration?: number;
      files?: FileTreeItem[];
      name: string;
      path: string;
      type: "folder" | "video";
    }[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(resolvedPath, entry.name);

      if (entry.isDirectory()) {
        rawEntries.push({
          name: entry.name,
          path: fullPath,
          type: "folder",
          files: []
        });
      } else if (isVideoFile(entry.name)) {
        const duration = await getVideoDuration(fullPath);
        rawEntries.push({
          name: entry.name,
          path: fullPath,
          type: "video",
          duration
        });
      }
    }

    // Use shared sorting utilities
    const sortedFiles = buildSortedFileTree(rawEntries, sortOptions);

    return {
      currentPath: resolvedPath,
      parentPath: isAtRoot ? null : parentPath,
      isAtRoot,
      files: sortedFiles
    };
  } catch (error) {
    logger.error(error, "Error loading directory contents");
    throw error;
  }
}

export type PickerResult =
  | {
      path: string;
      type: "file";
    }
  | {
      rootPath: string;
      tree: PickerNode[];
      type: "folder";
    };

export type PickerNode = FileTreeItem;

export type DirectoryContents = {
  currentPath: string;
  files: FileTreeItem[];
  isAtRoot: boolean;
  parentPath: string | null;
};

export type FileItem = FileTreeItem;

type FfmpegProbeMetadata = {
  format: {
    duration: number;
    filename: string;
  };
};
