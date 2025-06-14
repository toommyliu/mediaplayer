import { playerState, fileBrowserState, type FileSystemItem } from "@/state.svelte";
import { client } from "@/tipc";
import pino from "pino";

const logger = pino({
  browser: {
    asObject: true
  }
});
export type FileBrowserEvents = {
  addFile?: (filePath: string) => void;
  addFolder?: (folderData: any) => void;
};

export function transformDirectoryContents(directoryContents): FileSystemItem[] {
  if (!directoryContents || !directoryContents.files) return [];

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
      console.log(
        `Navigated to directory ${dirPath}, found ${allVideoFiles.length} videos recursively`
      );

      const { PlaylistManager } = await import("./playlist");
      if (allVideoFiles.length > 0) {
        PlaylistManager.addFolderContentsToCurrentPlaylist(allVideoFiles);
        console.log(
          `Added ${allVideoFiles.length} videos from directory (including subfolders) to current playlist (unsaved)`
        );
      }
    }
  } catch (err) {
    console.error("Failed to navigate to directory:", err);
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
    if (result && result.parentPath) {
      await navigateToDirectory(result.parentPath);
    }
  } catch (err) {
    console.error("Failed to navigate to parent directory:", err);
    fileBrowserState.error = "Failed to navigate to parent directory.";
    fileBrowserState.isLoading = false;
  }
}

export function closeAllContextMenus() {
  fileBrowserState.openContextMenu = null;
}

export function updatePlayerQueueForced(preserveCurrentVideo: boolean = false) {
  const currentVideo = preserveCurrentVideo ? playerState.currentVideo : null;

  playerState.queue = fileBrowserState.fileSystem.flatMap(function flatten(entry): string[] {
    if (entry.files) {
      return entry.files?.flatMap(flatten) ?? [];
    }
    if (entry.path && entry.duration !== undefined) {
      return [`file://${entry.path}`];
    }
    return [];
  });

  if (currentVideo) {
    const newIndex = playerState.queue.findIndex((src) => src === currentVideo);
    if (newIndex !== -1) {
      playerState.currentIndex = newIndex;
    } else {
      playerState.currentIndex = 0;
    }
  } else {
    playerState.currentIndex = 0;
  }
}

export async function loadFileSystemStructure() {
  try {
    fileBrowserState.isLoading = true;
    fileBrowserState.error = null;
    fileBrowserState.loadingFolders.clear();
    const result = await client.selectFileOrFolder();
    console.log("loadFileBrowser result:", result);

    if (result && result.rootPath) {
      fileBrowserState.originalPath = result.rootPath;

      playerState.currentTime = 0;
      playerState.duration = 0;
      playerState.isPlaying = false;
      playerState.currentIndex = 0;
      playerState.queue = [];
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
          playerState.queue = allVideoFiles.map((vf) => `file://${vf.path}`);
          playerState.currentIndex = 0;

          const { PlaylistManager } = await import("./playlist");
          PlaylistManager.addFolderContentsToCurrentPlaylist(allVideoFiles);
          console.log(`Added ${allVideoFiles.length} videos recursively to playlist`);
        }
      } else if (result === null) {
        fileBrowserState.error = null;
        fileBrowserState.fileTree = null;
        fileBrowserState.currentPath = null;
        fileBrowserState.isAtRoot = false;
        fileBrowserState.originalPath = null;
      } else {
        fileBrowserState.error = "No video files found in the selected folder";
        fileBrowserState.fileTree = null;
        fileBrowserState.currentPath = null;
        fileBrowserState.isAtRoot = false;
        fileBrowserState.originalPath = null;
      }
    }
  } catch (err) {
    console.error("Failed to load file system:", err);
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
): Promise<Array<{ name: string; path: string; duration?: number }>> {
  let videoFiles: Array<{ name: string; path: string; duration?: number }> = [];
  const indent = "  ".repeat(depth);
  console.log(`${indent}[FileManager] Scanning folder: ${folderPath}`);
  logger.info(`[FileManager] Scanning folder: ${folderPath}`);

  try {
    const contents = await client.readDirectory(folderPath);
    if (contents && contents.files) {
      console.log(`${indent}[FileManager] Found ${contents.files.length} items in folder`);

      for (const item of contents.files) {
        if (item.type === "video" && item.path && item.name) {
          videoFiles.push({ name: item.name, path: item.path, duration: item.duration });
          console.log(`${indent}[FileManager] - Found video: ${item.name}`);
        } else if (item.type === "folder" && item.path) {
          console.log(`${indent}[FileManager] > Entering subfolder: ${item.name}`);
          const nestedVideos = await getAllVideoFilesRecursive(item.path, depth + 1);
          console.log(
            `${indent}[FileManager] < Subfolder ${item.name} returned ${nestedVideos.length} videos`
          );
          videoFiles = videoFiles.concat(nestedVideos);
        }
      }
    }
  } catch (error) {
    console.error(
      `${indent}[FileManager] Error reading directory ${folderPath} recursively:`,
      error
    );
  }
  return videoFiles;
}

function extractDatePrefix(name: string): Date | null {
  // Match YYYY/MM/DD, YYYY-MM-DD, or YYYY.MM.DD patterns at the start of the filename
  const dateMatch = name.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    // Verify it's a valid date
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

function naturalCompare(a: string, b: string): number {
  // Split strings into chunks of letters and numbers
  const chunksA = a.match(/(\d+|\D+)/g) || [];
  const chunksB = b.match(/(\d+|\D+)/g) || [];

  const maxLength = Math.max(chunksA.length, chunksB.length);

  for (let i = 0; i < maxLength; i++) {
    const chunkA = chunksA[i] || "";
    const chunkB = chunksB[i] || "";

    // If both chunks are numeric, compare as numbers
    if (/^\d+$/.test(chunkA) && /^\d+$/.test(chunkB)) {
      const numA = parseInt(chunkA, 10);
      const numB = parseInt(chunkB, 10);
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
  // First, try to extract date prefixes
  const dateA = extractDatePrefix(a);
  const dateB = extractDatePrefix(b);

  // If both have date prefixes, sort by date first
  if (dateA && dateB) {
    const dateCompare = dateA.getTime() - dateB.getTime();
    if (dateCompare !== 0) {
      return dateCompare;
    }
    // If dates are the same, compare the rest of the filename
    const restA = a.replace(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\s*/, "");
    const restB = b.replace(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\s*/, "");
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
    // Folders first
    const aIsFolder = !!a.files;
    const bIsFolder = !!b.files;

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    // If both are folders or both are files, sort by the selected criteria
    switch (fileBrowserState.sortBy) {
      case "name":
        const aName = a.name || "";
        const bName = b.name || "";
        const nameCompare = smartNameCompare(aName, bName);
        return fileBrowserState.sortDirection === "asc" ? nameCompare : -nameCompare;

      case "duration":
        if (aIsFolder || bIsFolder) {
          const aName = a.name || "";
          const bName = b.name || "";
          const nameCompare = smartNameCompare(aName, bName);
          return fileBrowserState.sortDirection === "asc" ? nameCompare : -nameCompare;
        }
        const aDuration = a.duration || 0;
        const bDuration = b.duration || 0;
        const durationCompare = aDuration - bDuration;
        return fileBrowserState.sortDirection === "asc" ? durationCompare : -durationCompare;

      default:
        return 0;
    }
  });
}
