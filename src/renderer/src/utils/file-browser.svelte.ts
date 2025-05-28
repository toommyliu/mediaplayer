import { playerState, fileBrowserState, type FileSystemItem } from "@/state.svelte";
import { client } from "@/client";

export type FileBrowserEvents = {
  addFile?: (filePath: string) => void;
  addFolder?: (folderData: any) => void;
};

export function transformFileBrowserResult(items: any[]): FileSystemItem[] {
  return items.map((entry) => {
    if (entry.files && Array.isArray(entry.files)) {
      const pathParts = entry.path.split(/[/\\]/);
      const folderName = pathParts[pathParts.length - 1];

      return {
        name: folderName,
        path: entry.path,
        children: transformFileBrowserResult(entry.files),
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
}

export function toggleFolder(path: string) {
  if (fileBrowserState.expandedFolders.has(path)) {
    fileBrowserState.expandedFolders.delete(path);
  } else {
    fileBrowserState.expandedFolders.add(path);
  }
  fileBrowserState.expandedFolders = new Set(fileBrowserState.expandedFolders);
}

export function openContextMenuForItem(itemPath: string) {
  fileBrowserState.openContextMenu = itemPath;
}

export function closeAllContextMenus() {
  fileBrowserState.openContextMenu = null;
}

export function updatePlayerQueue() {
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
  updatePlayerQueue();
}

// Set a folder in the file system
export function setFolderInFileSystem(folderData) {
  if (folderData && folderData.files) {
    const transformedFolder = transformFileBrowserResult(folderData.files);

    fileBrowserState.fileSystem = transformedFolder;
    updatePlayerQueue();
  }
}

export async function loadFileSystemStructure() {
  try {
    fileBrowserState.error = null;
    const result = await client.selectFileOrFolder();
    console.log("loadFileBrowser result:", result);

    if (result && result.files && result.files.length > 0) {
      fileBrowserState.fileSystem = transformFileBrowserResult(result.files);
      updatePlayerQueue();
    } else if (result === null) {
      fileBrowserState.error = null;
      fileBrowserState.fileSystem = [];
    } else {
      fileBrowserState.error = "No video files found in the selected folder";
      fileBrowserState.fileSystem = [];
    }
  } catch (err) {
    console.error("Failed to load file system:", err);
    fileBrowserState.error = "Failed to load file system. Please try again.";
    fileBrowserState.fileSystem = [];
  }
}
