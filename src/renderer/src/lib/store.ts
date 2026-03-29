import { create } from "zustand";
import { flattenVideoFiles, sortFileTree } from "../../../shared";
import type { DirectoryContents, PickerResult } from "@/lib/contracts";
import {
  enterFullscreen,
  exitFullscreen,
  getAllVideoFiles,
  getPlatform,
  readDirectory,
  selectFileOrFolder,
  showItemInFolder
} from "@/lib/ipc";
import type {
  AppState,
  FileSystemItem,
  HotkeyCategory,
  NotificationPosition,
  QueueItem,
  SidebarPosition,
  SidebarTab
} from "@/types";

const STORAGE_KEYS = {
  hotkeys: "mediaplayer-hotkeys",
  notificationUpNextEnabled: "notification:upNextEnabled",
  notificationUpNextPosition: "notification:upNextPosition",
  notificationVideoInfoEnabled: "notification:videoInfoEnabled",
  sidebarPosition: "sidebar:position",
  sidebarWidth: "sidebar:width",
  volume: "volume"
} as const;

let videoElement: HTMLVideoElement | null = null;

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function makeQueueId(path: string): string {
  return `${path}-${crypto.randomUUID()}`;
}

export function toFileUrl(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}

export function normalizeVideoPath(path: string): string {
  return path.startsWith("file://") ? path.slice(7) : path;
}

export function getCurrentQueueItem(state: AppState): QueueItem | null {
  return state.queue.items.length > 0 ? state.queue.items[state.queue.index] ?? null : null;
}

function getInitialState(): AppState {
  const defaultWidth = 20;
  const minWidth = 15;
  const maxWidth = 40;
  const storedWidth = clamp(
    readStorage<number>(STORAGE_KEYS.sidebarWidth, defaultWidth),
    minWidth,
    maxWidth
  );
  const storedPosition = readStorage<SidebarPosition>(STORAGE_KEYS.sidebarPosition, "left");
  const volumeValue = clamp(readStorage<number>(STORAGE_KEYS.volume, 1), 0, 1);

  return {
    fileBrowser: {
      currentPath: null,
      error: null,
      expandedFolders: new Set<string>(),
      fileTree: null,
      focusedItemPath: null,
      isAtRoot: false,
      isLoading: false,
      loadingFolders: new Set<string>(),
      openContextMenu: null,
      originalPath: null,
      scrollTop: 0,
      sortBy: "name",
      sortDirection: "asc"
    },
    hotkeys: {
      categories: [],
      enabled: true,
      initialized: false,
      modKey: ""
    },
    notifications: {
      upNextEnabled: readStorage<boolean>(STORAGE_KEYS.notificationUpNextEnabled, true),
      upNextPosition: readStorage<NotificationPosition>(
        STORAGE_KEYS.notificationUpNextPosition,
        "top-right"
      ),
      videoInfoEnabled: readStorage<boolean>(STORAGE_KEYS.notificationVideoInfoEnabled, true)
    },
    platform: {
      isLinux: false,
      isMac: false,
      isWindows: false,
      pathSep: "/"
    },
    player: {
      aspectRatio: "contain",
      currentTime: 0,
      currentVideo: null,
      duration: 0,
      error: null,
      isFullscreen: false,
      isHolding: false,
      isLoading: false,
      isPlaying: false,
      showControls: true
    },
    queue: {
      index: 0,
      items: [],
      repeatMode: "off"
    },
    settings: {
      showDialog: false
    },
    sidebar: {
      currentTab: "file-browser",
      defaultWidth,
      dropZoneActive: null,
      isDragging: false,
      isOpen: true,
      maxWidth,
      minWidth,
      position: storedPosition,
      width: storedWidth
    },
    volume: {
      isMuted: volumeValue === 0,
      value: volumeValue
    }
  };
}

function applyVolumeToVideo(state: AppState): void {
  if (!videoElement) return;
  videoElement.volume = state.volume.isMuted ? 0 : state.volume.value;
  videoElement.muted = state.volume.isMuted;
}

type AppActions = {
  addMultipleToQueue: (items: Array<{ duration?: number; name: string; path: string }>) => boolean;
  addNextToQueue: (item: Omit<QueueItem, "id">) => boolean;
  addToQueue: (item: Omit<QueueItem, "id">) => boolean;
  addToQueueAtIndex: (item: Omit<QueueItem, "id">, index: number) => boolean;
  bindVideoElement: (element: HTMLVideoElement | null) => void;
  clearStoredHotkeys: () => void;
  decreaseVolume: () => void;
  findFolderInFileSystem: (items: FileSystemItem[], targetPath: string) => FileSystemItem | null;
  getStoredHotkeys: () => Record<string, string[]> | null;
  handleAddFileEvent: (result: PickerResult) => Promise<void>;
  handleAddFolderEvent: (result: PickerResult) => Promise<void>;
  handlePickerResult: (result: PickerResult) => Promise<void>;
  increaseVolume: () => void;
  initializeQueue: () => void;
  loadFileSystemStructure: () => Promise<void>;
  loadFolderContents: (folderPath: string) => Promise<void>;
  loadPlatform: () => Promise<void>;
  moveQueueItem: (fromIndex: number, toIndex: number) => boolean;
  navigateToDirectory: (dirPath: string) => Promise<void>;
  navigateToParent: () => Promise<void>;
  pausePlayback: () => void;
  playNextVideo: () => Promise<void>;
  playPreviousVideo: () => Promise<void>;
  playVideo: (src: string) => void;
  removeFromQueue: (itemId: string) => boolean;
  resetFileBrowser: () => void;
  resetPlayer: () => void;
  resetQueue: () => void;
  setCurrentTime: (currentTime: number) => void;
  setDuration: (duration: number) => void;
  setFileBrowserScrollTop: (scrollTop: number) => void;
  setFileBrowserSort: (sortBy: "duration" | "name") => void;
  setFileBrowserState: (patch: Partial<AppState["fileBrowser"]>) => void;
  setFullscreen: (isFullscreen: boolean) => Promise<void>;
  setHotkeyCategories: (categories: HotkeyCategory[], modKey: string, initialized: boolean) => void;
  setMuted: (isMuted: boolean) => void;
  setNotificationSettings: (patch: Partial<AppState["notifications"]>) => void;
  setPlayerState: (patch: Partial<AppState["player"]>) => void;
  setSettingsDialogOpen: (showDialog: boolean) => void;
  setSidebarDragging: (isDragging: boolean) => void;
  setSidebarDropZone: (dropZoneActive: SidebarPosition | null) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  setSidebarTab: (currentTab: SidebarTab) => void;
  setSidebarWidth: (width: number) => void;
  setStoredHotkeys: (hotkeys: Record<string, string[]>) => void;
  setVolume: (value: number) => void;
  showItemInFolder: (path: string) => Promise<void>;
  shuffleQueue: () => void;
  stopPlayback: (clearCurrentVideo?: boolean) => void;
  toggleFolder: (path: string) => void;
  togglePlayPause: () => Promise<void>;
  toggleRepeatMode: () => void;
  toggleSidebar: () => void;
  transformDirectoryContents: (directoryContents: DirectoryContents) => FileSystemItem[];
  updateFolderContents: (
    items: FileSystemItem[],
    targetPath: string,
    newContents: FileSystemItem[]
  ) => FileSystemItem[] | null;
  updatePlayerQueueForced: (preserveCurrentVideo?: boolean) => void;
};

export type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set, get) => ({
  ...getInitialState(),

  addMultipleToQueue(items) {
    let added = false;
    for (const item of items) {
      if (get().addToQueue(item)) {
        added = true;
      }
    }
    return added;
  },

  addNextToQueue(item) {
    return get().addToQueueAtIndex(item, get().queue.index + 1);
  },

  addToQueue(item) {
    const existingItem = get().queue.items.find((current) => current.path === item.path);
    if (existingItem) return false;

    set((state) => ({
      queue: {
        ...state.queue,
        items: [
          ...state.queue.items,
          {
            ...item,
            id: makeQueueId(item.path)
          }
        ]
      }
    }));

    return true;
  },

  addToQueueAtIndex(item, index) {
    if (!item.path || !item.name) return false;

    const state = get();
    const existingIndex = state.queue.items.findIndex((current) => current.path === item.path);
    if (existingIndex !== -1) {
      let targetIndex = index;
      if (existingIndex < index) {
        targetIndex = Math.max(0, index - 1);
      }
      return get().moveQueueItem(existingIndex, targetIndex);
    }

    const items = [...state.queue.items];
    const safeIndex = clamp(index, 0, items.length);
    items.splice(safeIndex, 0, {
      ...item,
      id: makeQueueId(item.path)
    });

    set((current) => ({
      queue: {
        ...current.queue,
        index: safeIndex <= current.queue.index ? current.queue.index + 1 : current.queue.index,
        items
      }
    }));

    return true;
  },

  bindVideoElement(element) {
    videoElement = element;
    applyVolumeToVideo(get());
  },

  clearStoredHotkeys() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEYS.hotkeys);
  },

  decreaseVolume() {
    const next = Math.max(0, get().volume.value - 0.1);
    get().setVolume(next);
    get().setMuted(next === 0);
  },

  findFolderInFileSystem(items, targetPath) {
    for (const item of items) {
      if (item.path === targetPath && item.files !== undefined) {
        return item;
      }

      if (item.files) {
        const found = get().findFolderInFileSystem(item.files, targetPath);
        if (found) return found;
      }
    }

    return null;
  },

  getStoredHotkeys() {
    return readStorage<Record<string, string[]> | null>(STORAGE_KEYS.hotkeys, null);
  },

  async handleAddFileEvent(result) {
    if (result.type !== "file") return;
    get().resetQueue();
    get().addToQueue({
      name: result.path.split("/").pop() ?? "Video",
      path: result.path
    });
    get().playVideo(result.path);
  },

  async handleAddFolderEvent(result) {
    if (result.type === "file") {
      await get().handleAddFileEvent(result);
      return;
    }

    try {
      get().setFileBrowserState({ error: null });
      await get().handlePickerResult(result);
    } catch {
      get().setFileBrowserState({
        error: "Failed to load file system. Please try again."
      });
      get().resetFileBrowser();
    }
  },

  async handlePickerResult(result) {
    if (result.type === "file") {
      get().resetQueue();
      get().addToQueue({
        duration: 0,
        name: result.path.split("/").pop() ?? "Unknown Video",
        path: result.path
      });
      get().playVideo(result.path);
      get().setFileBrowserState({ isLoading: false });
      return;
    }

    set((state) => ({
      fileBrowser: {
        ...state.fileBrowser,
        originalPath: result.rootPath
      },
      player: {
        ...state.player,
        currentTime: 0,
        duration: 0,
        isPlaying: false
      }
    }));

    get().resetQueue();
    videoElement?.pause();

    const dirResult = await readDirectory(result.rootPath);
    const nextFileTree = {
      files: get().transformDirectoryContents(dirResult),
      rootPath: dirResult.currentPath
    };

    set((state) => ({
      fileBrowser: {
        ...state.fileBrowser,
        currentPath: dirResult.currentPath,
        fileTree: nextFileTree,
        isAtRoot: dirResult.isAtRoot,
        isLoading: false
      }
    }));

    const allVideoFiles = await getAllVideoFiles(result.rootPath);
    if (allVideoFiles.length > 0) {
      get().addMultipleToQueue(allVideoFiles);
      get().playVideo(allVideoFiles[0].path);
    }
  },

  increaseVolume() {
    const next = Math.min(1, get().volume.value + 0.1);
    get().setVolume(next);
    if (next > 0) get().setMuted(false);
  },

  initializeQueue() {
    get().resetQueue();
  },

  async loadFileSystemStructure() {
    get().setFileBrowserState({
      error: null,
      isLoading: true,
      loadingFolders: new Set<string>()
    });

    try {
      const result = await selectFileOrFolder();
      if (!result) {
        get().setFileBrowserState({ isLoading: false });
        return;
      }

      await get().handlePickerResult(result);
    } catch {
      get().setFileBrowserState({
        currentPath: null,
        error: "Failed to load file system. Please try again.",
        fileTree: null,
        isAtRoot: false,
        isLoading: false,
        originalPath: null
      });
    }
  },

  async loadFolderContents(folderPath) {
    const fileSystem = get().fileBrowser.fileTree?.files ?? [];
    const folder = get().findFolderInFileSystem(fileSystem, folderPath);
    if (!folder || (folder.files && folder.files.length > 0)) return;

    const loadingFolders = new Set(get().fileBrowser.loadingFolders);
    loadingFolders.add(folderPath);
    get().setFileBrowserState({ loadingFolders });

    try {
      const result = await readDirectory(folderPath);
      const folderContents = get().transformDirectoryContents(result);
      const updated = get().updateFolderContents(fileSystem, folderPath, folderContents);

      if (updated && get().fileBrowser.fileTree) {
        set((state) => ({
          fileBrowser: {
            ...state.fileBrowser,
            fileTree: {
              ...state.fileBrowser.fileTree!,
              files: updated
            }
          }
        }));
      }
    } finally {
      const nextLoading = new Set(get().fileBrowser.loadingFolders);
      nextLoading.delete(folderPath);
      get().setFileBrowserState({ loadingFolders: nextLoading });
    }
  },

  async loadPlatform() {
    const info = await getPlatform();
    set({
      platform: {
        isLinux: info.isLinux,
        isMac: info.isMacOS,
        isWindows: info.isWindows,
        pathSep: info.pathSep
      }
    });
  },

  moveQueueItem(fromIndex, toIndex) {
    const items = [...get().queue.items];
    if (
      fromIndex < 0 ||
      fromIndex >= items.length ||
      toIndex < 0 ||
      toIndex >= items.length
    ) {
      return false;
    }

    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);

    let index = get().queue.index;
    if (index === fromIndex) {
      index = toIndex;
    } else if (fromIndex < index && toIndex >= index) {
      index -= 1;
    } else if (fromIndex > index && toIndex <= index) {
      index += 1;
    }

    set((state) => ({
      queue: {
        ...state.queue,
        index,
        items
      }
    }));

    return true;
  },

  async navigateToDirectory(dirPath) {
    try {
      get().setFileBrowserState({
        error: null,
        isLoading: true,
        loadingFolders: new Set<string>()
      });

      const result = await readDirectory(dirPath);
      const nextFileTree = {
        files: get().transformDirectoryContents(result),
        rootPath: result.currentPath
      };

      set((state) => ({
        fileBrowser: {
          ...state.fileBrowser,
          currentPath: result.currentPath,
          error: null,
          fileTree: nextFileTree,
          isAtRoot: result.isAtRoot,
          isLoading: false
        }
      }));

      get().updatePlayerQueueForced(true);
      const allVideoFiles = await getAllVideoFiles(dirPath);
      if (allVideoFiles.length > 0) {
        get().addMultipleToQueue(allVideoFiles);
      }
    } catch {
      get().setFileBrowserState({
        error: "Failed to load directory. Please try again.",
        isLoading: false
      });
    }
  },

  async navigateToParent() {
    const state = get();
    if (!state.fileBrowser.currentPath || state.fileBrowser.isAtRoot) return;

    get().setFileBrowserState({ isLoading: true });
    try {
      const result = await readDirectory(state.fileBrowser.currentPath);
      if (result.parentPath) {
        await get().navigateToDirectory(result.parentPath);
      }
    } catch {
      get().setFileBrowserState({
        error: "Failed to navigate to parent directory.",
        isLoading: false
      });
    }
  },

  pausePlayback() {
    videoElement?.pause();
    get().setPlayerState({ isPlaying: false });
  },

  async playNextVideo() {
    if (!videoElement || !getCurrentQueueItem(get())) return;
    if (get().queue.items.length === 0) return;

    let nextIndex = get().queue.index + 1;
    if (nextIndex >= get().queue.items.length) {
      if (get().queue.repeatMode === "all") {
        nextIndex = 0;
      } else {
        videoElement.pause();
        get().setPlayerState({ isPlaying: false });
        return;
      }
    }

    const item = get().queue.items[nextIndex];
    set((state) => ({
      player: {
        ...state.player,
        currentTime: 0,
        currentVideo: toFileUrl(item.path)
      },
      queue: {
        ...state.queue,
        index: nextIndex
      }
    }));

    videoElement.currentTime = 0;
    videoElement.load();
  },

  async playPreviousVideo() {
    if (!videoElement || !getCurrentQueueItem(get())) return;
    if (get().queue.items.length === 0) return;

    let nextIndex = get().queue.index - 1;
    if (nextIndex < 0) {
      if (get().queue.repeatMode === "all") {
        nextIndex = get().queue.items.length - 1;
      } else {
        videoElement.pause();
        get().setPlayerState({ isPlaying: false });
        return;
      }
    }

    const item = get().queue.items[nextIndex];
    set((state) => ({
      player: {
        ...state.player,
        currentTime: 0,
        currentVideo: toFileUrl(item.path)
      },
      queue: {
        ...state.queue,
        index: nextIndex
      }
    }));

    videoElement.currentTime = 0;
    videoElement.load();
  },

  playVideo(src) {
    const normalized = normalizeVideoPath(src);
    const queueIndex = get().queue.items.findIndex((item) => item.path === normalized);
    if (queueIndex === -1) return;

    set((state) => ({
      player: {
        ...state.player,
        currentTime: 0,
        currentVideo: toFileUrl(normalized),
        error: null,
        isLoading: true,
        isPlaying: true
      },
      queue: {
        ...state.queue,
        index: queueIndex
      }
    }));

    if (videoElement) {
      videoElement.currentTime = 0;
      videoElement.load();
    }
  },

  removeFromQueue(itemId) {
    const index = get().queue.items.findIndex((item) => item.id === itemId);
    if (index === -1) return false;

    const items = get().queue.items.filter((item) => item.id !== itemId);
    let nextIndex = get().queue.index;
    if (nextIndex > index) {
      nextIndex -= 1;
    } else if (nextIndex === index && nextIndex >= items.length) {
      nextIndex = Math.max(0, items.length - 1);
    }

    set((state) => ({
      queue: {
        ...state.queue,
        index: nextIndex,
        items
      }
    }));

    return true;
  },

  resetFileBrowser() {
    set((state) => ({
      fileBrowser: {
        ...state.fileBrowser,
        currentPath: null,
        expandedFolders: new Set<string>(),
        fileTree: null,
        isAtRoot: false,
        isLoading: false,
        loadingFolders: new Set<string>(),
        originalPath: null
      }
    }));
  },

  resetPlayer() {
    set((state) => ({
      player: {
        ...state.player,
        currentTime: 0,
        duration: 0,
        isPlaying: false
      }
    }));
  },

  resetQueue() {
    set((state) => ({
      queue: {
        ...state.queue,
        index: 0,
        items: []
      }
    }));
  },

  setCurrentTime(currentTime) {
    set((state) => ({
      player: {
        ...state.player,
        currentTime
      }
    }));
  },

  setDuration(duration) {
    set((state) => ({
      player: {
        ...state.player,
        duration
      }
    }));
  },

  setFileBrowserScrollTop(scrollTop) {
    set((state) => ({
      fileBrowser: {
        ...state.fileBrowser,
        scrollTop
      }
    }));
  },

  setFileBrowserSort(sortBy) {
    set((state) => ({
      fileBrowser: {
        ...state.fileBrowser,
        sortBy,
        sortDirection:
          state.fileBrowser.sortBy === sortBy
            ? state.fileBrowser.sortDirection === "asc"
              ? "desc"
              : "asc"
            : "asc"
      }
    }));
  },

  setFileBrowserState(patch) {
    set((state) => ({
      fileBrowser: {
        ...state.fileBrowser,
        ...patch
      }
    }));
  },

  async setFullscreen(isFullscreen) {
    get().setPlayerState({ isFullscreen });
    if (isFullscreen) {
      await enterFullscreen();
    } else {
      await exitFullscreen();
    }
  },

  setHotkeyCategories(categories, modKey, initialized) {
    set((state) => ({
      hotkeys: {
        ...state.hotkeys,
        categories,
        initialized,
        modKey
      }
    }));
  },

  setMuted(isMuted) {
    set((state) => ({
      volume: {
        ...state.volume,
        isMuted
      }
    }));
    applyVolumeToVideo(get());
  },

  setNotificationSettings(patch) {
    const next = {
      ...get().notifications,
      ...patch
    };

    writeStorage(STORAGE_KEYS.notificationUpNextEnabled, next.upNextEnabled);
    writeStorage(STORAGE_KEYS.notificationUpNextPosition, next.upNextPosition);
    writeStorage(STORAGE_KEYS.notificationVideoInfoEnabled, next.videoInfoEnabled);

    set({
      notifications: next
    });
  },

  setPlayerState(patch) {
    set((state) => ({
      player: {
        ...state.player,
        ...patch
      }
    }));
  },

  setSettingsDialogOpen(showDialog) {
    set({
      settings: {
        showDialog
      }
    });
  },

  setSidebarDragging(isDragging) {
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        dropZoneActive: isDragging ? state.sidebar.dropZoneActive : null,
        isDragging
      }
    }));
  },

  setSidebarDropZone(dropZoneActive) {
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        dropZoneActive
      }
    }));
  },

  setSidebarOpen(isOpen) {
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        isOpen
      }
    }));
  },

  setSidebarPosition(position) {
    writeStorage(STORAGE_KEYS.sidebarPosition, position);
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        dropZoneActive: null,
        isDragging: false,
        isOpen: true,
        position
      }
    }));
  },

  setSidebarTab(currentTab) {
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        currentTab
      }
    }));
  },

  setSidebarWidth(width) {
    const clamped = Math.round(
      clamp(width, get().sidebar.minWidth, get().sidebar.maxWidth) * 10
    ) / 10;
    writeStorage(STORAGE_KEYS.sidebarWidth, clamped);
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        width: clamped
      }
    }));
  },

  setStoredHotkeys(hotkeys) {
    writeStorage(STORAGE_KEYS.hotkeys, hotkeys);
  },

  setVolume(value) {
    const next = clamp(value, 0, 1);
    writeStorage(STORAGE_KEYS.volume, next);
    set((state) => ({
      volume: {
        isMuted: next === 0 ? true : state.volume.isMuted,
        value: next
      }
    }));
    applyVolumeToVideo(get());
  },

  async showItemInFolder(path) {
    await showItemInFolder(path);
  },

  shuffleQueue() {
    const currentItem = getCurrentQueueItem(get());
    if (!currentItem || get().queue.items.length <= 1) return;

    const otherItems = get().queue.items.filter((item) => item.id !== currentItem.id);
    for (let index = otherItems.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [otherItems[index], otherItems[randomIndex]] = [otherItems[randomIndex], otherItems[index]];
    }

    set((state) => ({
      queue: {
        ...state.queue,
        index: 0,
        items: [currentItem, ...otherItems]
      }
    }));
  },

  stopPlayback(clearCurrentVideo = false) {
    videoElement?.pause();
    if (videoElement) {
      videoElement.currentTime = 0;
    }
    set((state) => ({
      player: {
        ...state.player,
        currentTime: 0,
        currentVideo: clearCurrentVideo ? null : state.player.currentVideo,
        isPlaying: false
      }
    }));
  },

  toggleFolder(path) {
    const nextExpanded = new Set(get().fileBrowser.expandedFolders);
    if (nextExpanded.has(path)) {
      nextExpanded.delete(path);
    } else {
      nextExpanded.add(path);
      void get().loadFolderContents(path);
    }

    get().setFileBrowserState({ expandedFolders: nextExpanded });
  },

  async togglePlayPause() {
    if (!videoElement || !getCurrentQueueItem(get())) return;

    if (get().player.isPlaying) {
      videoElement.pause();
      get().setPlayerState({ isPlaying: false });
      return;
    }

    try {
      await videoElement.play();
      get().setPlayerState({ isPlaying: true });
    } catch {
      // Ignore autoplay failures.
    }
  },

  toggleRepeatMode() {
    const repeatMode =
      get().queue.repeatMode === "off"
        ? "all"
        : get().queue.repeatMode === "all"
          ? "one"
          : "off";

    set((state) => ({
      queue: {
        ...state.queue,
        repeatMode
      }
    }));
  },

  toggleSidebar() {
    get().setSidebarOpen(!get().sidebar.isOpen);
  },

  transformDirectoryContents(directoryContents) {
    if (!directoryContents?.files) return [];

    return sortFileTree(
      directoryContents.files.map((item) => ({
        duration: item.duration ?? 0,
        files: item.type === "folder" ? [] : undefined,
        name: item.name,
        path: item.path,
        type: item.type
      })),
      {
        sortBy: get().fileBrowser.sortBy,
        sortDirection: get().fileBrowser.sortDirection
      }
    );
  },

  updateFolderContents(items, targetPath, newContents) {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item.path === targetPath && item.files !== undefined) {
        const nextItems = [...items];
        nextItems[index] = { ...item, files: newContents };
        return nextItems;
      }

      if (item.files) {
        const updated = get().updateFolderContents(item.files, targetPath, newContents);
        if (updated) {
          const nextItems = [...items];
          nextItems[index] = { ...item, files: updated };
          return nextItems;
        }
      }
    }

    return null;
  },

  updatePlayerQueueForced(preserveCurrentVideo = false) {
    const currentVideo = preserveCurrentVideo ? getCurrentQueueItem(get()) : null;
    const videoFiles = flattenVideoFiles(get().fileBrowser.fileTree?.files ?? []);
    const nextItems = videoFiles.map((video) => ({
      duration: video.duration ?? 0,
      id: makeQueueId(video.path),
      name: video.name,
      path: video.path
    }));

    const nextIndex = currentVideo
      ? Math.max(0, nextItems.findIndex((item) => item.path === currentVideo.path))
      : 0;

    set((state) => ({
      queue: {
        ...state.queue,
        index: nextIndex,
        items: nextItems
      }
    }));
  }
}));
