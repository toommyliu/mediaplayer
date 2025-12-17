import { client } from "$/tipc";
import {
  flattenVideoFiles,
  sortFileTree,
  type FileTreeItem,
  type SortOptions
} from "$shared/index";
import { playerState } from "$lib/state/player.svelte";
import { queue } from "$lib/state/queue.svelte";
import { QueueManager } from "$lib/queue-manager";

class FileBrowserState {
  public fileTree = $state<FileTree | null>(null);

  public expandedFolders = $state(new Set<string>());

  public error = $state<string | null>(null);

  public openContextMenu = $state<string | null>(null);

  public currentPath = $state<string | null>(null);

  public isAtRoot = $state(false);

  public originalPath = $state<string | null>(null);

  public sortBy = $state<"duration" | "name">("name");

  public sortDirection = $state<"asc" | "desc">("asc");

  public isLoading = $state(false);

  public loadingFolders = $state(new Set<string>());

  public focusedItemPath = $state<string | null>(null);

  public scrollTop = $state(0);

  public get fileSystem() {
    return this.fileTree?.files ?? [];
  }

  public reset() {
    this.fileTree = null;
    this.currentPath = null;
    this.isAtRoot = false;
    this.originalPath = null;
    this.isLoading = false;
    // Reassign to a new Set so Svelte's $state detects the change
    this.expandedFolders = new Set<string>();
  }

  public transformDirectoryContents(directoryContents): FileSystemItem[] {
    if (!directoryContents?.files) return [];

    const items = directoryContents.files.map((item) => ({
      name: item.name,
      path: item.path,
      duration: item.duration ?? 0,
      files: item.type === "folder" ? [] : undefined,
      type: item.type
    }));

    return this.sortFileSystem(items);
  }

  public async navigateToDirectory(dirPath: string) {
    try {
      this.isLoading = true;
      this.error = null;
      this.loadingFolders.clear();
      const result = await client.readDirectory(dirPath);

      if (result) {
        this.fileTree = {
          rootPath: result.currentPath,
          files: this.transformDirectoryContents(result)
        };
        this.currentPath = result.currentPath;
        this.isAtRoot = result.isAtRoot;

        this.updatePlayerQueueForced(true);

        const allVideoFiles = await client.getAllVideoFiles(dirPath);

        if (allVideoFiles.length > 0) {
          QueueManager.addMultipleToQueue(allVideoFiles);
        }
      }
    } catch (error) {
      console.error("Failed to navigate to directory:", error);
      this.error = "Failed to load directory. Please try again.";
    } finally {
      this.isLoading = false;
    }
  }

  public async navigateToParent() {
    if (!this.currentPath || this.isAtRoot) return;

    try {
      this.isLoading = true;
      const result = await client.readDirectory(this.currentPath);
      if (result?.parentPath) {
        await this.navigateToDirectory(result.parentPath);
      }
    } catch (error) {
      console.error("Failed to navigate to parent directory:", error);
      this.error = "Failed to navigate to parent directory.";
      this.isLoading = false;
    }
  }

  public updatePlayerQueueForced(preserveCurrentVideo: boolean = false) {
    const currentVideo = preserveCurrentVideo ? queue.currentItem : null;

    // Use shared utility to flatten video files
    const videoFiles = flattenVideoFiles(this.fileSystem);

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

  public async loadFileSystemStructure() {
    try {
      this.isLoading = true;
      this.error = null;
      this.loadingFolders.clear();
      const result = await client.selectFileOrFolder();
      console.log("loadFileBrowser result:", result);

      // Immediately play the video (if it's a string, it should be a video file path)
      if (result?.type === "file") {
        console.log("result.path", result.path);

        QueueManager.clear();
        QueueManager.addToQueue({
          name: result.path.split("/").pop() ?? "Unknown Video",
          path: result.path,
          duration: 0
        });

        playerState.playVideo(`file://${result.path}`);

        return;
      }

      if (result?.rootPath) {
        this.originalPath = result.rootPath;

        playerState.currentTime = 0;
        playerState.duration = 0;
        playerState.isPlaying = false;
        QueueManager.clear();
        if (playerState.videoElement) {
          playerState.videoElement.pause();
        }

        const dirResult = await client.readDirectory(result.rootPath);
        if (dirResult) {
          this.fileTree = {
            rootPath: dirResult.currentPath,
            files: this.transformDirectoryContents(dirResult)
          };
          this.currentPath = dirResult.currentPath;
          this.isAtRoot = dirResult.isAtRoot;

          const allVideoFiles = await client.getAllVideoFiles(result.rootPath);
          console.log(
            `Found ${allVideoFiles.length} video files recursively in ${result.rootPath}`
          );

          if (allVideoFiles.length > 0) {
            QueueManager.addMultipleToQueue(allVideoFiles);
            playerState.playVideo(allVideoFiles[0].path);
          }
        } else if (result === null) {
          console.warn("No video files found in the selected folder (1)");
          this.reset();
        } else {
          console.warn("No video files found in the selected folder (2)");
          this.error = "No video files found in the selected folder";
          this.reset();
        }
      }
    } catch (error) {
      console.error("Failed to load file system:", error);
      this.error = "Failed to load file system. Please try again.";
      this.fileTree = null;
      this.currentPath = null;
      this.isAtRoot = false;
      this.originalPath = null;
    } finally {
      this.isLoading = false;
    }
  }

  private sortFileSystem(files: FileSystemItem[]): FileSystemItem[] {
    const sortOptions: SortOptions = {
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };

    return sortFileTree(files, sortOptions);
  }
}

export const fileBrowserState = new FileBrowserState();

export type FileSystemItem = FileTreeItem;

export type FileTree = {
  files: FileSystemItem[];
  rootPath: string;
};
