import { getContext, setContext } from "svelte";
import { playerState } from "@/state.svelte";

export type FileSystemItem = {
  name: string;
  type: "folder" | "video" | "file";
  path: string;
  size?: number;
  duration?: number;
  children?: FileSystemItem[];
};

export type FileBrowserState = {
  fileSystem: FileSystemItem[];
  expandedFolders: Set<string>;
  error: string | null;
  openContextMenu: string | null;
};

export type FileBrowserEvents = {
  addFile?: (filePath: string) => void;
  addFolder?: (folderData: any) => void;
};

const FILE_BROWSER_CONTEXT_KEY = Symbol("file-browser");

export class FileBrowserContext {
  fileSystem = $state<FileSystemItem[]>([]);
  expandedFolders = $state(new Set<string>());
  error = $state<string | null>(null);
  openContextMenu = $state<string | null>(null);

  constructor() {}

  transformFileBrowserResult(items: any[]): FileSystemItem[] {
    return items.map((entry) => {
      if (entry.files && Array.isArray(entry.files)) {
        const pathParts = entry.path.split(/[/\\]/);
        const folderName = pathParts[pathParts.length - 1];

        return {
          name: folderName,
          path: entry.path,
          children: this.transformFileBrowserResult(entry.files),
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

  toggleFolder(path: string) {
    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path);
    } else {
      this.expandedFolders.add(path);
    }
    this.expandedFolders = new Set(this.expandedFolders);
  }

  openContextMenuForItem(itemPath: string) {
    this.openContextMenu = itemPath;
  }

  closeAllContextMenus() {
    this.openContextMenu = null;
  }

  updatePlayerQueue() {
    playerState.queue = this.fileSystem.flatMap(function flatten(entry): string[] {
      if (entry.type === "folder") {
        return entry.children?.flatMap(flatten) ?? [];
      }
      if (entry.type === "video") {
        return [`file://${entry.path}`];
      }
      return [];
    });

    // Reset current index to 0 when file system is reset
    playerState.currentIndex = 0;
  }

  setFileInFileSystem(filePath: string) {
    const pathParts = filePath.split(/[/\\]/);
    const fileName = pathParts[pathParts.length - 1];

    const newFileItem: FileSystemItem = {
      name: fileName,
      path: filePath,
      duration: 0,
      type: "video"
    };

    this.fileSystem = [newFileItem];
    this.updatePlayerQueue();
  }

  setFolderInFileSystem(folderData: any) {
    if (folderData && folderData.files) {
      const transformedFolder = this.transformFileBrowserResult(folderData.files);

      this.fileSystem = transformedFolder;
      this.updatePlayerQueue();
    }
  }

  async loadFileSystemStructure() {
    try {
      this.error = null;
      const { loadFileBrowser } = await import("./ipc");
      const result = await loadFileBrowser();
      console.log("loadFileBrowser result:", result);

      if (result && result.files && result.files.length > 0) {
        this.fileSystem = this.transformFileBrowserResult(result.files);
        this.updatePlayerQueue();
      } else if (result === null) {
        this.error = null;
        this.fileSystem = [];
      } else {
        this.error = "No video files found in the selected folder";
        this.fileSystem = [];
      }
    } catch (err) {
      console.error("Failed to load file system:", err);
      this.error = "Failed to load file system. Please try again.";
      this.fileSystem = [];
    }
  }
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch((err) => {
    console.error("Failed to copy text to clipboard:", err);
  });
}

export function showInFinder(path: string) {
  window.electron.ipcRenderer.send("open-file-explorer", path);
}

// Context helpers
export function setFileBrowserContext(context: FileBrowserContext) {
  setContext(FILE_BROWSER_CONTEXT_KEY, context);
}

export function getFileBrowserContext(): FileBrowserContext {
  const context = getContext<FileBrowserContext>(FILE_BROWSER_CONTEXT_KEY);
  if (!context) {
    throw new Error(
      "FileBrowserContext not found. Make sure to call setFileBrowserContext in a parent component."
    );
  }
  return context;
}
