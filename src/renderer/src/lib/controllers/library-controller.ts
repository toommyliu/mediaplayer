import { flattenVideoFiles } from "../../../../shared";
import type { PickerResult } from "@/lib/contracts";
import {
  getAllVideoFiles,
  readDirectory,
  selectFileOrFolder,
  showItemInFolder
} from "@/lib/ipc";
import { getVideoElement } from "@/lib/controllers/media-runtime";
import {
  findFolderInFileSystem,
  getFileBrowserState,
  resetFileBrowser,
  setExpandedFolders,
  setFileBrowserState,
  transformDirectoryContents,
  updateFolderContents
} from "@/lib/state/file-browser";
import { resetPlayer, setPlayerState } from "@/lib/state/player";
import {
  addQueueItem,
  addQueueItems,
  getCurrentQueueItemFromState,
  getQueueState,
  resetQueue,
  setQueueItems
} from "@/lib/state/queue";
import { makeQueueId } from "@/lib/state/utils";
import { playVideo } from "@/lib/controllers/playback-controller";

export function initializeQueue(): void {
  resetQueue();
}

export function updatePlayerQueueForced(preserveCurrentVideo = false): void {
  const currentVideo = preserveCurrentVideo ? getCurrentQueueItemFromState(getQueueState()) : null;
  const fileBrowser = getFileBrowserState();
  const videoFiles = flattenVideoFiles(fileBrowser.fileTree?.files ?? []);
  const nextItems = videoFiles.map((video) => ({
    duration: video.duration ?? 0,
    id: makeQueueId(video.path),
    name: video.name,
    path: video.path
  }));

  const nextIndex = currentVideo
    ? Math.max(0, nextItems.findIndex((item) => item.path === currentVideo.path))
    : 0;

  setQueueItems(nextItems, nextIndex);
}

export async function handleAddFileEvent(result: PickerResult): Promise<void> {
  if (result.type !== "file") return;

  resetQueue();
  addQueueItem({
    name: result.path.split("/").pop() ?? "Video",
    path: result.path
  });
  playVideo(result.path);
}

export async function handleAddFolderEvent(result: PickerResult): Promise<void> {
  if (result.type === "file") {
    await handleAddFileEvent(result);
    return;
  }

  try {
    setFileBrowserState({ error: null });
    await handlePickerResult(result);
  } catch {
    setFileBrowserState({
      error: "Failed to load file system. Please try again."
    });
    resetFileBrowser();
  }
}

export async function handlePickerResult(result: PickerResult): Promise<void> {
  if (result.type === "file") {
    resetQueue();
    addQueueItem({
      duration: 0,
      name: result.path.split("/").pop() ?? "Unknown Video",
      path: result.path
    });
    playVideo(result.path);
    setFileBrowserState({ isLoading: false });
    return;
  }

  setFileBrowserState({
    originalPath: result.rootPath
  });
  setPlayerState({
    currentTime: 0,
    duration: 0,
    isPlaying: false
  });

  resetQueue();
  getVideoElement()?.pause();

  const fileBrowser = getFileBrowserState();
  const dirResult = await readDirectory(result.rootPath);
  const nextFileTree = {
    files: transformDirectoryContents(
      dirResult,
      fileBrowser.sortBy,
      fileBrowser.sortDirection
    ),
    rootPath: dirResult.currentPath
  };

  setFileBrowserState({
    currentPath: dirResult.currentPath,
    fileTree: nextFileTree,
    isAtRoot: dirResult.isAtRoot,
    isLoading: false
  });

  const allVideoFiles = await getAllVideoFiles(result.rootPath);
  if (allVideoFiles.length > 0) {
    addQueueItems(allVideoFiles);
    playVideo(allVideoFiles[0].path);
  }
}

export async function loadFileSystemStructure(): Promise<void> {
  setFileBrowserState({
    error: null,
    isLoading: true,
    loadingFolders: new Set<string>()
  });

  try {
    const result = await selectFileOrFolder();
    if (!result) {
      setFileBrowserState({ isLoading: false });
      return;
    }

    await handlePickerResult(result);
  } catch {
    setFileBrowserState({
      currentPath: null,
      error: "Failed to load file system. Please try again.",
      fileTree: null,
      isAtRoot: false,
      isLoading: false,
      originalPath: null
    });
  }
}

export async function loadFolderContents(folderPath: string): Promise<void> {
  const fileBrowser = getFileBrowserState();
  const fileSystem = fileBrowser.fileTree?.files ?? [];
  const folder = findFolderInFileSystem(fileSystem, folderPath);
  if (!folder || (folder.files && folder.files.length > 0)) return;

  const loadingFolders = new Set(fileBrowser.loadingFolders);
  loadingFolders.add(folderPath);
  setFileBrowserState({ loadingFolders });

  try {
    const result = await readDirectory(folderPath);
    const latest = getFileBrowserState();
    const folderContents = transformDirectoryContents(
      result,
      latest.sortBy,
      latest.sortDirection
    );
    const updated = updateFolderContents(fileSystem, folderPath, folderContents);

    if (updated && getFileBrowserState().fileTree) {
      setFileBrowserState({
        fileTree: {
          ...getFileBrowserState().fileTree!,
          files: updated
        }
      });
    }
  } finally {
    const nextLoading = new Set(getFileBrowserState().loadingFolders);
    nextLoading.delete(folderPath);
    setFileBrowserState({ loadingFolders: nextLoading });
  }
}

export async function navigateToDirectory(dirPath: string): Promise<void> {
  try {
    setFileBrowserState({
      error: null,
      isLoading: true,
      loadingFolders: new Set<string>()
    });

    const currentFileBrowser = getFileBrowserState();
    const result = await readDirectory(dirPath);
    const nextFileTree = {
      files: transformDirectoryContents(
        result,
        currentFileBrowser.sortBy,
        currentFileBrowser.sortDirection
      ),
      rootPath: result.currentPath
    };

    setFileBrowserState({
      currentPath: result.currentPath,
      error: null,
      fileTree: nextFileTree,
      isAtRoot: result.isAtRoot,
      isLoading: false
    });

    updatePlayerQueueForced(true);
    const allVideoFiles = await getAllVideoFiles(dirPath);
    if (allVideoFiles.length > 0) {
      addQueueItems(allVideoFiles);
    }
  } catch {
    setFileBrowserState({
      error: "Failed to load directory. Please try again.",
      isLoading: false
    });
  }
}

export async function navigateToParent(): Promise<void> {
  const fileBrowser = getFileBrowserState();
  if (!fileBrowser.currentPath || fileBrowser.isAtRoot) return;

  setFileBrowserState({ isLoading: true });
  try {
    const result = await readDirectory(fileBrowser.currentPath);
    if (result.parentPath) {
      await navigateToDirectory(result.parentPath);
    }
  } catch {
    setFileBrowserState({
      error: "Failed to navigate to parent directory.",
      isLoading: false
    });
  }
}

export function toggleFolder(path: string): void {
  const nextExpanded = new Set(getFileBrowserState().expandedFolders);
  if (nextExpanded.has(path)) {
    nextExpanded.delete(path);
  } else {
    nextExpanded.add(path);
    void loadFolderContents(path);
  }

  setExpandedFolders(nextExpanded);
}

export function resetAndBrowseLibrary(): void {
  resetFileBrowser();
  resetQueue();
  resetPlayer();
  void loadFileSystemStructure();
}

export async function revealItemInFolder(path: string): Promise<void> {
  await showItemInFolder(path);
}
