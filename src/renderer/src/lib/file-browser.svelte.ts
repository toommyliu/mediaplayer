import { client } from "$/tipc";
import {
  flattenVideoFiles,
  sortFileTree,
  type FileTreeItem,
  type SortOptions
} from "../../../shared";
import { fileBrowserState } from "$lib/state/file-browser.svelte";
import { playerState } from "$lib/state/player.svelte";
import { queue } from "$lib/state/queue.svelte";
import { QueueManager } from "./queue-manager";

// Type alias for backward compatibility
export type FileSystemItem = FileTreeItem;

export function transformDirectoryContents(directoryContents): FileSystemItem[] {
  if (!directoryContents?.files) return [];

  const items = directoryContents.files.map((item) => ({
    name: item.name,
    path: item.path,
    duration: item.duration ?? 0,
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

  // Use shared utility to flatten video files
  const videoFiles = flattenVideoFiles(fileBrowserState.fileSystem);

  queue.items = videoFiles.map((video) => ({
    id: `${video.path}-${Date.now()}`, // Generate a simple ID
    name: video.name,
    path: video.path,
    duration: video.duration ?? 0
  }));

  if (currentVideo) {
    const newIndex = queue.items.findIndex((item) => item.path === currentVideo.path);
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

      playerState.playVideo(`file://${result.path}`);

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

function sortFileSystem(files: FileSystemItem[]): FileSystemItem[] {
  const sortOptions: SortOptions = {
    sortBy: fileBrowserState.sortBy,
    sortDirection: fileBrowserState.sortDirection
  };

  return sortFileTree(files, sortOptions);
}
