import { playerState, fileBrowserState, type FileSystemItem } from "@/state.svelte";
import { client } from "@/client";

export type FileBrowserEvents = {
  addFile?: (filePath: string) => void;
  addFolder?: (folderData: any) => void;
};

export function transformDirectoryContents(directoryContents: any): FileSystemItem[] {
  if (!directoryContents || !directoryContents.files) return [];

  return directoryContents.files.map((item: any) => ({
    name: item.name,
    path: item.path,
    type: item.type,
    size: item.size,
    duration: item.duration || 0
  }));
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
      updatePlayerQueue();
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
      updatePlayerQueueForced();
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
    await navigateToDirectoryAndUpdateQueue(fileBrowserState.originalPath);
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

export function updatePlayerQueueForced() {
  playerState.queue = fileBrowserState.fileSystem.flatMap(function flatten(entry): string[] {
    if (entry.type === "folder") {
      return entry.children?.flatMap(flatten) ?? [];
    }
    if (entry.type === "video") {
      return [`file://${entry.path}`];
    }
    return [];
  });

  playerState.currentIndex = 0;
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
  updatePlayerQueueForced();
}

// Set a folder in the file system
export function setFolderInFileSystem(folderData) {
  if (folderData && folderData.files) {
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
    updatePlayerQueueForced();
  }
}

export async function loadFileSystemStructure() {
  try {
    fileBrowserState.error = null;
    const result = await client.selectFileOrFolder();
    console.log("loadFileBrowser result:", result);

    if (result && result.rootPath) {
      fileBrowserState.originalPath = result.rootPath;
      await navigateToDirectoryAndUpdateQueue(result.rootPath);
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
  } catch (err) {
    console.error("Failed to load file system:", err);
    fileBrowserState.error = "Failed to load file system. Please try again.";
    fileBrowserState.fileSystem = [];
    fileBrowserState.currentPath = null;
    fileBrowserState.isAtRoot = false;
    fileBrowserState.originalPath = null;
  }
}
