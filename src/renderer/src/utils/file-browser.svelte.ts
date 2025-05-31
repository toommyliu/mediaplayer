import { playerState, fileBrowserState, type FileSystemItem } from "@/state.svelte";
import { client } from "@/client";

export type FileBrowserEvents = {
  addFile?: (filePath: string) => void;
  addFolder?: (folderData: any) => void;
};

export function transformDirectoryContents(directoryContents): FileSystemItem[] {
  if (!directoryContents || !directoryContents.files) return [];

  const items = directoryContents.files.map((item) => ({
    name: item.name,
    path: item.path,
    type: item.type,
    duration: item.duration || 0
  }));

  return sortFileSystem(items);
}

export function toggleFolder(path: string) {
  if (fileBrowserState.expandedFolders.has(path)) {
    fileBrowserState.expandedFolders.delete(path);
  } else {
    fileBrowserState.expandedFolders.add(path);
  }
  fileBrowserState.expandedFolders = new Set(fileBrowserState.expandedFolders);
}

export async function navigateToDirectory(dirPath: string) {
  try {
    fileBrowserState.error = null;
    const result = await client.readDirectory(dirPath);

    if (result) {
      fileBrowserState.fileSystem = transformDirectoryContents(result);
      fileBrowserState.currentPath = result.currentPath;
      fileBrowserState.isAtRoot = result.isAtRoot;

      // Always update the queue when navigating to a new directory
      // This ensures that videos in nested folders are accessible
      updatePlayerQueueForced(true); // Preserve current video if it exists in new directory
    }
  } catch (err) {
    console.error("Failed to navigate to directory:", err);
    fileBrowserState.error = "Failed to load directory. Please try again.";
  }
}

export async function navigateToDirectoryAndUpdateQueue(dirPath: string) {
  try {
    fileBrowserState.error = null;
    const result = await client.readDirectory(dirPath);

    if (result) {
      fileBrowserState.fileSystem = transformDirectoryContents(result);
      fileBrowserState.currentPath = result.currentPath;
      fileBrowserState.isAtRoot = result.isAtRoot;
      // Force update the queue but don't try to preserve current video
      updatePlayerQueueForced(false);
    }
  } catch (err) {
    console.error("Failed to navigate to directory:", err);
    fileBrowserState.error = "Failed to load directory. Please try again.";
  }
}

export async function navigateToParent() {
  if (!fileBrowserState.currentPath || fileBrowserState.isAtRoot) return;

  try {
    const result = await client.readDirectory(fileBrowserState.currentPath);
    if (result && result.parentPath) {
      await navigateToDirectory(result.parentPath);
    }
  } catch (err) {
    console.error("Failed to navigate to parent directory:", err);
    fileBrowserState.error = "Failed to navigate to parent directory.";
  }
}

export async function navigateToOriginalDirectory() {
  if (fileBrowserState.originalPath) {
    await navigateToDirectory(fileBrowserState.originalPath);
  }
}

export function openContextMenuForItem(itemPath: string) {
  fileBrowserState.openContextMenu = itemPath;
}

export function closeAllContextMenus() {
  fileBrowserState.openContextMenu = null;
}

export function updatePlayerQueue() {
  const newVideos = fileBrowserState.fileSystem.flatMap(function flatten(entry): string[] {
    if (entry.type === "folder") {
      return entry.children?.flatMap(flatten) ?? [];
    }
    if (entry.type === "video") {
      return [`file://${entry.path}`];
    }
    return [];
  });

  if (newVideos.length > 0) {
    playerState.queue = newVideos;
    playerState.currentIndex = 0;
  }
}

export function updatePlayerQueueForced(preserveCurrentVideo: boolean = false) {
  // Store current video before updating queue
  const currentVideo = preserveCurrentVideo ? playerState.currentVideo : null;

  playerState.queue = fileBrowserState.fileSystem.flatMap(function flatten(entry): string[] {
    if (entry.type === "folder") {
      return entry.children?.flatMap(flatten) ?? [];
    }
    if (entry.type === "video") {
      return [`file://${entry.path}`];
    }
    return [];
  });

  // If we're preserving the current video and it exists, try to find it in the new queue
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

// Set a single file in the file system
export function setFileInFileSystem(filePath: string) {
  const pathParts = filePath.split(/[/\\]/);
  const fileName = pathParts[pathParts.length - 1];

  const newFileItem: FileSystemItem = {
    name: fileName,
    path: filePath,
    duration: 0,
    type: "video"
  };

  fileBrowserState.fileSystem = [newFileItem];
  updatePlayerQueueForced(false);
}

// Set a folder in the file system
export function setFolderInFileSystem(folderData) {
  if (folderData && folderData.files) {
    // Store current video before updating
    const currentVideo = playerState.currentVideo;

    const transformedItems = folderData.files.map((entry) => {
      if (entry.files && Array.isArray(entry.files)) {
        const pathParts = entry.path.split(/[/\\]/);
        const folderName = pathParts[pathParts.length - 1];
        return {
          name: folderName,
          path: entry.path,
          type: "folder" as const
        };
      } else {
        return {
          name: entry.name,
          path: entry.path,
          duration: entry.duration || 0,
          type: "video" as const
        };
      }
    });

    fileBrowserState.fileSystem = transformedItems;
    fileBrowserState.currentPath = folderData.rootPath || null;
    fileBrowserState.originalPath = folderData.rootPath || null;
    fileBrowserState.isAtRoot = false;

    // Update the queue and preserve the current playing video if there is one
    updatePlayerQueueForced(!!currentVideo);
  }
}

export async function loadFileSystemStructure() {
  try {
    fileBrowserState.error = null;
    const result = await client.selectFileOrFolder();
    console.log("loadFileBrowser result:", result);

    if (result && result.rootPath) {
      fileBrowserState.originalPath = result.rootPath;

      // Reset player state
      playerState.currentTime = 0;
      playerState.duration = 0;
      playerState.isPlaying = false;
      playerState.currentIndex = 0;
      playerState.queue = [];
      if (playerState.videoElement) {
        playerState.videoElement.pause();
      }

      // Navigate to the directory
      const dirResult = await client.readDirectory(result.rootPath);
      if (dirResult) {
        fileBrowserState.fileSystem = transformDirectoryContents(dirResult);
        fileBrowserState.currentPath = dirResult.currentPath;
        fileBrowserState.isAtRoot = dirResult.isAtRoot;

        // Update the queue but don't auto-play
        const videos = fileBrowserState.fileSystem.flatMap(function flatten(entry): string[] {
          if (entry.type === "folder") {
            return entry.children?.flatMap(flatten) ?? [];
          }
          if (entry.type === "video") {
            return [`file://${entry.path}`];
          }
          return [];
        });

        if (videos.length > 0) {
          playerState.queue = videos;
          playerState.currentIndex = 0;
          // Don't auto-play - let user manually select a video
        }
      } else if (result === null) {
        fileBrowserState.error = null;
        fileBrowserState.fileSystem = [];
        fileBrowserState.currentPath = null;
        fileBrowserState.isAtRoot = false;
        fileBrowserState.originalPath = null;
      } else {
        fileBrowserState.error = "No video files found in the selected folder";
        fileBrowserState.fileSystem = [];
        fileBrowserState.currentPath = null;
        fileBrowserState.isAtRoot = false;
        fileBrowserState.originalPath = null;
      }
    }
  } catch (err) {
    console.error("Failed to load file system:", err);
    fileBrowserState.error = "Failed to load file system. Please try again.";
    fileBrowserState.fileSystem = [];
    fileBrowserState.currentPath = null;
    fileBrowserState.isAtRoot = false;
    fileBrowserState.originalPath = null;
  }
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
    // Folders always come before files
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;

    // If both are folders or both are files, sort by the selected criteria
    switch (fileBrowserState.sortBy) {
      case "name":
        const nameCompare = smartNameCompare(a.name, b.name);
        return fileBrowserState.sortDirection === "asc" ? nameCompare : -nameCompare;

      case "duration":
        if (a.type !== "video" || b.type !== "video") {
          const nameCompare = smartNameCompare(a.name, b.name);
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

export function toggleSort(sortBy: "name" | "duration") {
  if (fileBrowserState.sortBy === sortBy) {
    // Toggle direction if clicking the same sort option
    fileBrowserState.sortDirection = fileBrowserState.sortDirection === "asc" ? "desc" : "asc";
  } else {
    // Set new sort option and default to ascending
    fileBrowserState.sortBy = sortBy;
    fileBrowserState.sortDirection = "asc";
  }

  // Apply the sort to the current file system
  fileBrowserState.fileSystem = sortFileSystem(fileBrowserState.fileSystem);

  updatePlayerQueueForced(true);
}
