import { client } from "$/tipc";
import { fileBrowserState, type FileSystemItem } from "$lib/state/file-browser.svelte";
import { playerState } from "$lib/state/player.svelte";
import { queue } from "$lib/state/queue.svelte";
import { QueueManager } from "./queue-manager";
import { playVideo } from "./video-playback";

export function transformDirectoryContents(directoryContents): FileSystemItem[] {
  if (!directoryContents?.files) return [];

  const items = directoryContents.files.map((item) => ({
    name: item.name,
    path: item.path,
    duration: item.duration || 0,
    files: item.type === "folder" ? [] : undefined,
    type: item.type
  }));

  return sortFileSystem(items);
}

export async function navigateToDirectory(dirPath: string) {
  try {
    fileBrowserState.isLoading = true;
    fileBrowserState.error = null;
    fileBrowserState.loadingFolders.clear();
    const result = await client.readDirectory(dirPath);

    if (result) {
      fileBrowserState.fileTree = {
        rootPath: result.currentPath,
        files: transformDirectoryContents(result)
      };
      fileBrowserState.currentPath = result.currentPath;
      fileBrowserState.isAtRoot = result.isAtRoot;

      updatePlayerQueueForced(true);

      const allVideoFiles = await getAllVideoFilesRecursive(dirPath);

      if (allVideoFiles.length > 0) {
        QueueManager.addMultipleToQueue(allVideoFiles);
      }
    }
  } catch (error) {
    console.error("Failed to navigate to directory:", error);
    fileBrowserState.error = "Failed to load directory. Please try again.";
  } finally {
    fileBrowserState.isLoading = false;
  }
}

export async function navigateToParent() {
  if (!fileBrowserState.currentPath || fileBrowserState.isAtRoot) return;

  try {
    fileBrowserState.isLoading = true;
    const result = await client.readDirectory(fileBrowserState.currentPath);
    if (result?.parentPath) {
      await navigateToDirectory(result.parentPath);
    }
  } catch (error) {
    console.error("Failed to navigate to parent directory:", error);
    fileBrowserState.error = "Failed to navigate to parent directory.";
    fileBrowserState.isLoading = false;
  }
}

export function updatePlayerQueueForced(preserveCurrentVideo: boolean = false) {
  const currentVideo = preserveCurrentVideo ? queue.currentItem : null;

  queue.items = fileBrowserState.fileSystem.flatMap(function flatten(entry) {
    if (entry.files) {
      return entry.files?.flatMap(flatten) ?? [];
    }

    if (entry.path && entry.duration !== undefined) {
      return {
        name: entry.name ?? entry.path.split("/").pop() ?? "Unknown Video",
        path: entry.path,
        duration: entry.duration
      };
    }

    return [];
  });

  if (currentVideo) {
    const newIndex = queue.items.indexOf(currentVideo);
    queue.index = newIndex === -1 ? 0 : newIndex;
  } else {
    queue.index = 0;
  }
}

export async function loadFileSystemStructure() {
  try {
    fileBrowserState.isLoading = true;
    fileBrowserState.error = null;
    fileBrowserState.loadingFolders.clear();
    const result = await client.selectFileOrFolder();
    console.log("loadFileBrowser result:", result);

    // Immediately play the video (if it's a string, it should be a video file path)
    if (result?.type === "file") {
      console.log("result.path", result.path);

      QueueManager.clearQueue();
      QueueManager.addToQueue({
        name: result.path.split("/").pop() ?? "Unknown Video",
        path: result.path,
        duration: 0
      });

      playVideo(`file://${result.path}`);

      return;
    }

    if (result?.rootPath) {
      fileBrowserState.originalPath = result.rootPath;

      playerState.currentTime = 0;
      playerState.duration = 0;
      playerState.isPlaying = false;
      QueueManager.clearQueue();
      if (playerState.videoElement) {
        playerState.videoElement.pause();
      }

      const dirResult = await client.readDirectory(result.rootPath);
      if (dirResult) {
        fileBrowserState.fileTree = {
          rootPath: dirResult.currentPath,
          files: transformDirectoryContents(dirResult)
        };
        fileBrowserState.currentPath = dirResult.currentPath;
        fileBrowserState.isAtRoot = dirResult.isAtRoot;

        const allVideoFiles = await getAllVideoFilesRecursive(result.rootPath);
        console.log(`Found ${allVideoFiles.length} video files recursively in ${result.rootPath}`);

        if (allVideoFiles.length > 0) {
          QueueManager.addMultipleToQueue(allVideoFiles);
        }
      } else if (result === null) {
        console.warn("No video files found in the selected folder (1)");
        fileBrowserState.reset();
      } else {
        console.warn("No video files found in the selected folder (2)");
        fileBrowserState.error = "No video files found in the selected folder";
        fileBrowserState.reset();
      }
    }
  } catch (error) {
    console.error("Failed to load file system:", error);
    fileBrowserState.error = "Failed to load file system. Please try again.";
    fileBrowserState.fileTree = null;
    fileBrowserState.currentPath = null;
    fileBrowserState.isAtRoot = false;
    fileBrowserState.originalPath = null;
  } finally {
    fileBrowserState.isLoading = false;
  }
}

export async function getAllVideoFilesRecursive(
  folderPath: string,
  depth: number = 0
): Promise<{ duration?: number; name: string; path: string }[]> {
  let videoFiles: { duration?: number; name: string; path: string }[] = [];
  const indent = "  ".repeat(depth);

  console.log(`${indent}[getAllVideoFilesRecursive] Scanning folder: ${folderPath}`);

  try {
    const contents = await client.readDirectory(folderPath);

    if (contents?.files) {
      for (const item of contents.files) {
        if (item.type === "video" && item.path && item.name) {
          const videoFile = { name: item.name, path: item.path, duration: item.duration };
          videoFiles.push(videoFile);
        } else if (item.type === "folder" && item.path) {
          const nestedVideos = await getAllVideoFilesRecursive(item.path, depth + 1);
          videoFiles = videoFiles.concat(nestedVideos);
        }
      }
    }
  } catch (error) {
    console.error(
      `${indent}[getAllVideoFilesRecursive] Error reading directory ${folderPath}:`,
      error
    );
  }

  return videoFiles;
}

function extractDatePrefix(name: string): Date | null {
  // Match YYYY/MM/DD, YYYY-MM-DD, or YYYY.MM.DD patterns at the start of the filename
  const dateMatch = /^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/.exec(name);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    const date = new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10)
    );

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function naturalCompare(a: string, b: string): number {
  // Split strings into chunks of letters and numbers
  const chunksA = a.match(/(\d+|\D+)/g) ?? [];
  const chunksB = b.match(/(\d+|\D+)/g) ?? [];

  const maxLength = Math.max(chunksA.length, chunksB.length);

  for (let idx = 0; idx < maxLength; idx++) {
    const chunkA = chunksA[idx] || "";
    const chunkB = chunksB[idx] || "";

    // Compare both chunks as numbers
    if (/^\d+$/.test(chunkA) && /^\d+$/.test(chunkB)) {
      const numA = Number.parseInt(chunkA, 10);
      const numB = Number.parseInt(chunkB, 10);
      if (numA !== numB) {
        return numA - numB;
      }
    } else {
      // Compare as strings
      const result = chunkA.localeCompare(chunkB, undefined, {
        numeric: true,
        sensitivity: "base"
      });
      if (result !== 0) {
        return result;
      }
    }
  }

  return 0;
}

function smartNameCompare(a: string, b: string): number {
  const dateA = extractDatePrefix(a);
  const dateB = extractDatePrefix(b);

  // Both have dates?
  if (dateA && dateB) {
    const dateCompare = dateA.getTime() - dateB.getTime();
    if (dateCompare !== 0) {
      return dateCompare;
    }

    // Fallback: compare by the remaining filename
    const restA = a.replace(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})\s*/, "");
    const restB = b.replace(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})\s*/, "");
    return naturalCompare(restA, restB);
  }

  // If only one has a date prefix, prioritize it
  if (dateA && !dateB) return -1;
  if (!dateA && dateB) return 1;

  // If neither has a date prefix, use natural comparison
  return naturalCompare(a, b);
}

function sortFileSystem(files: FileSystemItem[]): FileSystemItem[] {
  return [...files].sort((a, b) => {
    const aIsFolder = Boolean(a.files);
    const bIsFolder = Boolean(b.files);

    // Folders first
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    // Apply sorting based on the selected criteria
    switch (fileBrowserState.sortBy) {
      case "name": {
        const aName = a.name ?? "";
        const bName = b.name ?? "";
        const nameCompare = smartNameCompare(aName, bName);
        return fileBrowserState.sortDirection === "asc" ? nameCompare : -nameCompare;
      }

      case "duration": {
        if (aIsFolder || bIsFolder) {
          const aName = a.name ?? "";
          const bName = b.name ?? "";
          const nameCompare = smartNameCompare(aName, bName);
          return fileBrowserState.sortDirection === "asc" ? nameCompare : -nameCompare;
        }

        const aDuration = a.duration ?? 0;
        const bDuration = b.duration ?? 0;
        const durationCompare = aDuration - bDuration;
        return fileBrowserState.sortDirection === "asc" ? durationCompare : -durationCompare;
      }

      default:
        return 0;
    }
  });
}
