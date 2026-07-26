import type { PickerResult } from "@/lib/contracts";
import type { QueueInsertItem } from "@/stores/queue";
import type { FileSystemItem, QueueItem } from "@/types";
import { playVideo } from "@/actions/playback";
import {
  deleteFileSystemItem,
  readDirectory,
  renameFileSystemItem,
  selectFileOrFolder,
  showItemInFolder,
} from "@/lib/ipc";
import { normalizeVideoPath, toFileUrl } from "@/lib/media-path";
import {
  findFolderInFileSystem,
  transformDirectoryContents,
  updateFolderContents,
  useFileBrowserStore,
} from "@/stores/file-browser";
import { usePlayerStore } from "@/stores/player";
import { useQueueStore } from "@/stores/queue";
import { makeQueueId } from "@/stores/utils";
import { getVideoElement } from "@/video-element";
import { flattenVideoFiles } from "../../../shared";

function toQueueItems(videos: QueueInsertItem[]): QueueItem[] {
  return videos.map((video) => ({
    duration: video.duration ?? 0,
    id: makeQueueId(video.path),
    name: video.name,
    path: video.path,
  }));
}

export function updatePlayerQueueForced(preserveCurrentVideo = false): void {
  const currentVideo = preserveCurrentVideo ? usePlayerStore.getState().currentVideo : null;
  const fileBrowser = useFileBrowserStore.getState();
  const videoFiles = flattenVideoFiles(fileBrowser.fileTree?.files ?? []);
  const nextItems = toQueueItems(videoFiles);

  const normalizedCurrentVideo = currentVideo ? normalizeVideoPath(currentVideo) : null;
  const preservedIndex = normalizedCurrentVideo
    ? nextItems.findIndex((item) => normalizeVideoPath(item.path) === normalizedCurrentVideo)
    : -1;
  const nextIndex = currentVideo ? Math.max(0, preservedIndex) : 0;

  useQueueStore.getState().setQueueItems(nextItems, nextIndex);

  const selectedItem = nextItems[nextIndex];
  if (preserveCurrentVideo && currentVideo && preservedIndex === -1 && selectedItem) {
    usePlayerStore.getState().setPlayerState({
      currentTime: 0,
      currentVideo: toFileUrl(selectedItem.path),
      duration: selectedItem.duration ?? 0,
      error: null,
      isLoading: true,
      isPlaying: true,
    });
  }
}

export function playFileBrowserVideo(item: FileSystemItem): void {
  if (item.type !== "video") return;

  const currentVideo = usePlayerStore.getState().currentVideo;
  const normalizedItemPath = normalizeVideoPath(item.path);
  const normalizedCurrentVideo = currentVideo ? normalizeVideoPath(currentVideo) : null;
  const isCurrentVideo = normalizedCurrentVideo === normalizedItemPath;
  const queue = useQueueStore.getState();
  const queueIndex = queue.items.findIndex(
    (queueItem) => normalizeVideoPath(queueItem.path) === normalizedItemPath,
  );

  if (queueIndex !== -1) {
    if (isCurrentVideo) {
      queue.setQueueIndex(queueIndex);
      return;
    }

    playVideo(item.path);
    return;
  }

  const fileBrowser = useFileBrowserStore.getState();
  let nextItems = toQueueItems(flattenVideoFiles(fileBrowser.fileTree?.files ?? []));
  let nextIndex = nextItems.findIndex(
    (queueItem) => normalizeVideoPath(queueItem.path) === normalizedItemPath,
  );

  if (nextIndex === -1) {
    nextItems = toQueueItems([
      {
        duration: item.duration ?? 0,
        name: item.name,
        path: item.path,
      },
    ]);
    nextIndex = 0;
  }

  queue.setQueueItems(nextItems, nextIndex);

  if (!isCurrentVideo) {
    playVideo(item.path);
  }
}

export async function handleAddFileEvent(result: PickerResult): Promise<void> {
  if (result.type !== "file") return;

  const queue = useQueueStore.getState();
  queue.resetQueue();
  queue.addQueueItem({
    name: result.path.split("/").pop() ?? "Video",
    path: result.path,
  });
  playVideo(result.path);
}

export async function handleAddFolderEvent(result: PickerResult): Promise<void> {
  if (result.type === "file") {
    await handleAddFileEvent(result);
    return;
  }

  try {
    useFileBrowserStore.getState().setFileBrowserState({ error: null });
    await handlePickerResult(result);
  } catch {
    useFileBrowserStore.getState().setFileBrowserState({
      error: "Failed to load file system. Please try again.",
    });
    useFileBrowserStore.getState().resetFileBrowser();
  }
}

export async function handlePickerResult(result: PickerResult): Promise<void> {
  if (result.type === "file") {
    const queue = useQueueStore.getState();
    queue.resetQueue();
    queue.addQueueItem({
      duration: 0,
      name: result.path.split("/").pop() ?? "Unknown Video",
      path: result.path,
    });
    playVideo(result.path);
    useFileBrowserStore.getState().setFileBrowserState({ isLoading: false });
    return;
  }

  const fileBrowserStore = useFileBrowserStore.getState();
  fileBrowserStore.setFileBrowserState({ originalPath: result.rootPath });
  usePlayerStore.getState().setPlayerState({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
  });

  useQueueStore.getState().resetQueue();
  getVideoElement()?.pause();

  const dirResult = await readDirectory(result.rootPath);
  const latestFileBrowser = useFileBrowserStore.getState();
  const nextFileTree = {
    files: transformDirectoryContents(
      dirResult,
      latestFileBrowser.sortBy,
      latestFileBrowser.sortDirection,
    ),
    rootPath: dirResult.currentPath,
  };

  useFileBrowserStore.getState().setFileBrowserState({
    currentPath: dirResult.currentPath,
    fileTree: nextFileTree,
    isAtRoot: dirResult.isAtRoot,
    isLoading: false,
  });

  const videoFiles = flattenVideoFiles(nextFileTree.files ?? []);
  if (videoFiles.length > 0) {
    useQueueStore.getState().addQueueItems(videoFiles);
    playVideo(videoFiles[0].path);
  }
}

export async function loadFileSystemStructure(): Promise<void> {
  useFileBrowserStore.getState().setFileBrowserState({
    error: null,
    isLoading: true,
    loadingFolders: new Set<string>(),
  });

  try {
    const result = await selectFileOrFolder();
    if (!result) {
      useFileBrowserStore.getState().setFileBrowserState({ isLoading: false });
      return;
    }

    await handlePickerResult(result);
  } catch {
    useFileBrowserStore.getState().setFileBrowserState({
      currentPath: null,
      error: "Failed to load file system. Please try again.",
      fileTree: null,
      isAtRoot: false,
      isLoading: false,
      originalPath: null,
    });
  }
}

export async function loadFolderContents(folderPath: string): Promise<void> {
  const fileBrowser = useFileBrowserStore.getState();
  const fileSystem = fileBrowser.fileTree?.files ?? [];
  const folder = findFolderInFileSystem(fileSystem, folderPath);
  if (!folder || (folder.files && folder.files.length > 0)) return;

  const loadingFolders = new Set(fileBrowser.loadingFolders);
  loadingFolders.add(folderPath);
  useFileBrowserStore.getState().setFileBrowserState({ loadingFolders });

  try {
    const result = await readDirectory(folderPath);
    const latest = useFileBrowserStore.getState();
    const folderContents = transformDirectoryContents(result, latest.sortBy, latest.sortDirection);
    const latestFileSystem = latest.fileTree?.files ?? [];
    const updated = updateFolderContents(latestFileSystem, folderPath, folderContents);

    const tree = useFileBrowserStore.getState().fileTree;
    if (updated && tree) {
      useFileBrowserStore.getState().setFileBrowserState({
        fileTree: {
          ...tree,
          files: updated,
        },
      });
      updatePlayerQueueForced(true);
    }
  } finally {
    const nextLoading = new Set(useFileBrowserStore.getState().loadingFolders);
    nextLoading.delete(folderPath);
    useFileBrowserStore.getState().setFileBrowserState({ loadingFolders: nextLoading });
  }
}

export async function navigateToDirectory(dirPath: string): Promise<void> {
  try {
    useFileBrowserStore.getState().setFileBrowserState({
      error: null,
      isLoading: true,
      loadingFolders: new Set<string>(),
    });

    const currentFileBrowser = useFileBrowserStore.getState();
    const result = await readDirectory(dirPath);
    const nextFileTree = {
      files: transformDirectoryContents(
        result,
        currentFileBrowser.sortBy,
        currentFileBrowser.sortDirection,
      ),
      rootPath: result.currentPath,
    };

    useFileBrowserStore.getState().setFileBrowserState({
      currentPath: result.currentPath,
      error: null,
      fileTree: nextFileTree,
      isAtRoot: result.isAtRoot,
      isLoading: false,
    });

    updatePlayerQueueForced(true);
  } catch {
    useFileBrowserStore.getState().setFileBrowserState({
      error: "Failed to load directory. Please try again.",
      isLoading: false,
    });
  }
}

export async function navigateToParent(): Promise<void> {
  const fileBrowser = useFileBrowserStore.getState();
  if (!fileBrowser.currentPath || fileBrowser.isAtRoot) return;

  useFileBrowserStore.getState().setFileBrowserState({ isLoading: true });
  try {
    const result = await readDirectory(fileBrowser.currentPath);
    if (result.parentPath) {
      await navigateToDirectory(result.parentPath);
    }
  } catch {
    useFileBrowserStore.getState().setFileBrowserState({
      error: "Failed to navigate to parent directory.",
      isLoading: false,
    });
  }
}

export function toggleFolder(path: string): void {
  const nextExpanded = new Set(useFileBrowserStore.getState().expandedFolders);
  if (nextExpanded.has(path)) {
    nextExpanded.delete(path);
  } else {
    nextExpanded.add(path);
    void loadFolderContents(path);
  }

  useFileBrowserStore.getState().setExpandedFolders(nextExpanded);
}

export function resetAndBrowseLibrary(): void {
  useFileBrowserStore.getState().resetFileBrowser();
  useQueueStore.getState().resetQueue();
  usePlayerStore.getState().resetPlayer();
  void loadFileSystemStructure();
}

export async function revealItemInFolder(path: string): Promise<void> {
  await showItemInFolder(path);
}

function isPathWithin(path: string, parentPath: string): boolean {
  return path === parentPath || path.startsWith(`${parentPath}/`);
}

function removeItemPath(items: FileSystemItem[], deletedPath: string): FileSystemItem[] {
  return items.flatMap((item) => {
    if (item.path === deletedPath) return [];

    return {
      ...item,
      files: item.files ? removeItemPath(item.files, deletedPath) : undefined,
    };
  });
}

function removePathSet(paths: Set<string>, deletedPath: string): Set<string> {
  const next = new Set<string>();
  for (const path of paths) {
    if (!isPathWithin(path, deletedPath)) {
      next.add(path);
    }
  }
  return next;
}

function clearDeletedPath(path: string | null, deletedPath: string): string | null {
  return path && isPathWithin(path, deletedPath) ? null : path;
}

function updateItemPath(
  items: FileSystemItem[],
  oldPath: string,
  newPath: string,
  newName: string,
): FileSystemItem[] {
  return items.map((item) => {
    const path =
      item.path === oldPath
        ? newPath
        : item.path.startsWith(`${oldPath}/`)
          ? `${newPath}${item.path.slice(oldPath.length)}`
          : item.path;

    return {
      ...item,
      files: item.files ? updateItemPath(item.files, oldPath, newPath, newName) : undefined,
      name: item.path === oldPath ? newName : item.name,
      path,
    };
  });
}

function updatePathSet(paths: Set<string>, oldPath: string, newPath: string): Set<string> {
  const next = new Set<string>();
  for (const path of paths) {
    if (path === oldPath) {
      next.add(newPath);
    } else if (path.startsWith(`${oldPath}/`)) {
      next.add(`${newPath}${path.slice(oldPath.length)}`);
    } else {
      next.add(path);
    }
  }
  return next;
}

function renamePath(path: string, oldPath: string, newPath: string): string {
  if (path === oldPath) return newPath;

  if (path.startsWith(`${oldPath}/`)) return `${newPath}${path.slice(oldPath.length)}`;

  return path;
}

export async function deleteFileBrowserItem(item: FileSystemItem): Promise<void> {
  await deleteFileSystemItem(item.path);

  const fileBrowser = useFileBrowserStore.getState();
  const fileTree = fileBrowser.fileTree
    ? isPathWithin(fileBrowser.fileTree.rootPath, item.path)
      ? null
      : {
          ...fileBrowser.fileTree,
          files: removeItemPath(fileBrowser.fileTree.files, item.path),
        }
    : null;

  useFileBrowserStore.getState().setFileBrowserState({
    currentPath: clearDeletedPath(fileBrowser.currentPath, item.path),
    error: null,
    expandedFolders: removePathSet(fileBrowser.expandedFolders, item.path),
    fileTree,
    focusedItemPath: null,
    loadingFolders: removePathSet(fileBrowser.loadingFolders, item.path),
    originalPath: clearDeletedPath(fileBrowser.originalPath, item.path),
  });

  const queue = useQueueStore.getState();
  const previousCurrentItem = queue.items[queue.index] ?? null;
  const nextItems = queue.items.filter(
    (queueItem) => !isPathWithin(normalizeVideoPath(queueItem.path), item.path),
  );
  const preservedIndex = previousCurrentItem
    ? nextItems.findIndex((queueItem) => queueItem.id === previousCurrentItem.id)
    : -1;
  const nextIndex =
    preservedIndex === -1
      ? Math.min(queue.index, Math.max(0, nextItems.length - 1))
      : preservedIndex;

  queue.setQueueItems(nextItems, nextIndex);

  const currentVideo = usePlayerStore.getState().currentVideo;
  const normalizedCurrentVideo = currentVideo ? normalizeVideoPath(currentVideo) : null;
  if (normalizedCurrentVideo && isPathWithin(normalizedCurrentVideo, item.path)) {
    const nextItem = nextItems[nextIndex];
    usePlayerStore.getState().setPlayerState({
      currentTime: 0,
      currentVideo: nextItem ? toFileUrl(nextItem.path) : null,
      duration: 0,
      error: null,
      isLoading: Boolean(nextItem),
      isPlaying: Boolean(nextItem),
      seekUndoStack: [],
    });

    if (!nextItem) {
      getVideoElement()?.pause();
    }
  }
}

export async function renameFileBrowserItem(item: FileSystemItem, newName: string): Promise<void> {
  const result = await renameFileSystemItem({
    newName,
    path: item.path,
  });

  const fileBrowser = useFileBrowserStore.getState();
  const fileTree = fileBrowser.fileTree
    ? {
        ...fileBrowser.fileTree,
        files: updateItemPath(
          fileBrowser.fileTree.files,
          result.oldPath,
          result.newPath,
          result.name,
        ),
        rootPath: renamePath(fileBrowser.fileTree.rootPath, result.oldPath, result.newPath),
      }
    : null;

  useFileBrowserStore.getState().setFileBrowserState({
    currentPath: fileBrowser.currentPath
      ? renamePath(fileBrowser.currentPath, result.oldPath, result.newPath)
      : null,
    error: null,
    expandedFolders: updatePathSet(fileBrowser.expandedFolders, result.oldPath, result.newPath),
    fileTree,
    focusedItemPath: result.newPath,
    loadingFolders: updatePathSet(fileBrowser.loadingFolders, result.oldPath, result.newPath),
    originalPath: fileBrowser.originalPath
      ? renamePath(fileBrowser.originalPath, result.oldPath, result.newPath)
      : null,
  });

  const queue = useQueueStore.getState();
  queue.setQueueItems(
    queue.items.map((queueItem) => {
      const nextPath = renamePath(queueItem.path, result.oldPath, result.newPath);
      return {
        ...queueItem,
        id: nextPath !== queueItem.path ? makeQueueId(nextPath) : queueItem.id,
        name: queueItem.path === result.oldPath ? result.name : queueItem.name,
        path: nextPath,
      };
    }),
    queue.index,
  );

  const currentVideo = usePlayerStore.getState().currentVideo;
  const normalizedCurrentVideo = currentVideo ? normalizeVideoPath(currentVideo) : null;
  const renamedCurrentVideo = normalizedCurrentVideo
    ? renamePath(normalizedCurrentVideo, result.oldPath, result.newPath)
    : null;
  if (renamedCurrentVideo && renamedCurrentVideo !== normalizedCurrentVideo) {
    usePlayerStore.getState().setPlayerState({
      currentVideo: toFileUrl(renamedCurrentVideo),
    });
  }
}
