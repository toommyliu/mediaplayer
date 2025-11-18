import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { app, BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import { execFile } from "node:child_process";
import { chmod, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { sortFileTree, type FileTreeItem, type SortOptions } from "../shared";
import { DEFAULT_SORT_OPTIONS, VIDEO_EXTENSIONS } from "../shared/constants";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);
let isFfmpegInitialized = false;

// Directory contents cache
const directoryCache = new Map<string, DirectoryContents>();

// The previous dialog path
let previousPath: string | null = null;

const isHidden = (name: string) => name.startsWith(".");

/**
 * Normalizes paths to use forward slashes for cross-platform consistency
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Checks if a file has a supported video extension
 */
export function isVideoFile(filename: string): boolean {
  const ext = extname(filename).replace(".", "").toLowerCase();
  return ext ? VIDEO_EXTENSIONS.includes(ext) : false;
}

/**
 * Transforms a raw directory entry into a FileTreeItem
 */
export function createFileTreeItem(
  name: string,
  path: string,
  type: "folder" | "video",
  duration?: number,
  files?: FileTreeItem[]
): FileTreeItem {
  const item: FileTreeItem = {
    name,
    path: normalizePath(path),
    type
  };

  if (type === "video" && duration !== undefined) {
    item.duration = duration;
  }

  if (type === "folder") {
    item.files = files || [];
  }

  return item;
}

/**
 * Builds a sorted file tree from directory contents
 */
export function buildSortedFileTree(
  entries: Array<{
    name: string;
    path: string;
    type: "folder" | "video";
    duration?: number;
    files?: Array<{
      name: string;
      path: string;
      type: "folder" | "video";
      duration?: number;
    }>;
  }>,
  sortOptions: SortOptions
): FileTreeItem[] {
  const items: FileTreeItem[] = entries.map((entry) =>
    createFileTreeItem(
      entry.name,
      entry.path,
      entry.type,
      entry.duration,
      entry.files ? buildSortedFileTree(entry.files, sortOptions) : undefined
    )
  );

  return sortFileTree(items, sortOptions);
}

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

  isFfmpegInitialized = true;
}

/**
 * Get the duration of a video file.
 *
 * @param filePath - The path to the video file.
 * @returns The video duration in seconds.
 */
export async function getVideoDuration(filePath: string): Promise<number> {
  const metadata = await getFfprobeMetadata(filePath);
  const rawDuration = metadata?.format?.duration;
  if (typeof rawDuration === "number") return rawDuration;

  const parsed = parseFloat(String(rawDuration ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Execute ffprobe and return JSON metadata.
 */
async function getFfprobeMetadata(filePath: string): Promise<FfmpegProbeMetadata> {
  await doFfmpegInit();

  try {
    const args = ["-v", "error", "-show_format", "-print_format", "json", filePath];
    const { stdout } = (await execFileAsync(ffprobeInstaller.path, args)) as { stdout: string; stderr: string };
    if (!stdout) return {} as FfmpegProbeMetadata;

    // Return parsed JSON; duration might be a string or number depending on ffprobe version
    return JSON.parse(stdout) as FfmpegProbeMetadata;
  } catch (error) {
    logger.error(error, `Error getting ffprobe metadata for ${filePath}`);
    return {} as FfmpegProbeMetadata;
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
        path: normalizePath(filePaths[0])
      };
    } else if (mode === "folder" || mode === "both") {
      const selectedPath = filePaths[0];
      const stats = await stat(selectedPath);
      if (stats.isFile()) {
        previousPath = dirname(selectedPath);
        logger.debug(`previousPath set to: ${previousPath}`);
        return {
          type: "file",
          path: normalizePath(selectedPath)
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

  const rootPath = normalizePath(dirPath);
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
    if (isHidden(entry.name)) continue;

    if (entry.isDirectory()) {
      const subDirPath = normalizePath(join(dirPath, entry.name));
      const subTree = await buildFileTree(subDirPath, sortOptions);
      entries.push({
        path: subDirPath,
        name: entry.name,
        type: "folder",
        files: subTree.type === "folder" ? subTree.tree : []
      });
    } else {
      const filePath = normalizePath(join(dirPath, entry.name));
      if (isVideoFile(entry.name)) {
        const duration = await getVideoDuration(filePath);
        entries.push({
          path: filePath,
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
  const resolvedPath = normalizePath(resolve(dirPath));

  // Check cache first
  if (directoryCache.has(resolvedPath)) {
    return directoryCache.get(resolvedPath)!;
  }

  try {
    const entries = await readdir(resolvedPath, { withFileTypes: true });

    const parentPath = normalizePath(dirname(resolvedPath));
    const isAtRoot = resolvedPath === parentPath;

    const rawEntries: {
      duration?: number;
      files?: FileTreeItem[];
      name: string;
      path: string;
      type: "folder" | "video";
    }[] = [];

      for (const entry of entries) {
        if (isHidden(entry.name)) continue;

      const fullPath = normalizePath(join(resolvedPath, entry.name));

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

    const sortedFiles = buildSortedFileTree(rawEntries, sortOptions);

    const contents: DirectoryContents = {
      currentPath: resolvedPath,
      parentPath: isAtRoot ? null : parentPath,
      isAtRoot,
      files: sortedFiles
    };

    directoryCache.set(resolvedPath, contents);

    return contents;
  } catch (error) {
    logger.error(error, "Error loading directory contents");
    throw error;
  }
}

export async function getAllVideoFilesRecursive(
  folderPath: string
): Promise<{ duration?: number; name: string; path: string }[]> {
  const videoFiles: { duration?: number; name: string; path: string }[] = [];

  async function scan(dirPath: string) {
    const contents = await loadDirectoryContents(dirPath);

    for (const item of contents.files) {
      if (item.type === "video") {
        videoFiles.push({
          name: item.name,
          path: item.path,
          duration: item.duration
        });
      } else if (item.type === "folder") {
        await scan(item.path);
      }
    }
  }

  await scan(folderPath);
  return videoFiles;
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

type FfmpegProbeMetadata = {
  format?: {
    duration?: string | number;
    filename?: string;
    [key: string]: unknown;
  };
  streams?: unknown[];
  [key: string]: unknown;
};
