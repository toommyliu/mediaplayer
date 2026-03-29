import type {
  HotkeyCategory,
  NotificationPosition,
  QueueItem,
  SidebarPosition,
  SidebarTab
} from "@/types";
import { normalizeVideoPath, toFileUrl } from "@/lib/media-path";
import { bootstrapApp, loadPlatformInfo } from "@/lib/controllers/app-controller";
import {
  handleAddFileEvent,
  handleAddFolderEvent,
  handlePickerResult,
  initializeQueue,
  loadFileSystemStructure,
  navigateToDirectory,
  navigateToParent,
  resetAndBrowseLibrary,
  revealItemInFolder,
  toggleFolder,
  updatePlayerQueueForced
} from "@/lib/controllers/library-controller";
import {
  bindPlaybackVideoElement,
  pausePlayback,
  playNextVideo,
  playPreviousVideo,
  playVideo,
  setFullscreen,
  stopPlayback,
  togglePlayPause
} from "@/lib/controllers/playback-controller";
import {
  decreaseVolumeWithMediaSync,
  increaseVolumeWithMediaSync,
  setMutedWithMediaSync,
  setVolumeWithMediaSync
} from "@/lib/controllers/volume-controller";
import {
  findFolderInFileSystem,
  setFileBrowserScrollTop,
  setFileBrowserSort,
  setFileBrowserState,
  transformDirectoryContents,
  updateFolderContents,
  useFileBrowserState,
  type FileBrowserState
} from "@/lib/state/file-browser";
import {
  clearStoredHotkeys,
  getHotkeysState,
  getStoredHotkeys,
  setHotkeyCategories,
  setStoredHotkeys,
  updateHotkeyInState,
  useHotkeysState
} from "@/lib/state/hotkeys";
import {
  getPlayerState,
  resetPlayer,
  setCurrentTime,
  setDuration,
  setPlayerState,
  usePlayerState
} from "@/lib/state/player";
import {
  addQueueItem,
  addQueueItemAtIndex,
  addQueueItemNext,
  addQueueItems,
  getCurrentQueueItemFromState,
  getQueueState,
  moveQueueItem,
  removeQueueItem,
  resetQueue,
  setQueueRepeatMode,
  shuffleQueue,
  toggleRepeatMode,
  type QueueInsertItem,
  type QueueState,
  useQueueState
} from "@/lib/state/queue";
import { useNotificationsStore } from "@stores/notifications";
import { usePlatformStore } from "@stores/platform";
import { useSettingsStore } from "@stores/settings";
import { useSidebarStore } from "@stores/sidebar";
import { useVolumeStore } from "@stores/volume";

type Selector<State, Value> = (state: State) => Value;

export function useQueueSelector<T>(selector: Selector<QueueState, T>): T {
  return useQueueState(selector);
}

export function useFileBrowserSelector<T>(selector: Selector<FileBrowserState, T>): T {
  return useFileBrowserState(selector);
}

export function useCurrentQueueItem(): QueueItem | null {
  const queue = useQueueSelector((state) => state);
  return getCurrentQueueItemFromState(queue);
}

export function getCurrentQueueItem(): QueueItem | null {
  return getCurrentQueueItemFromState(getQueueState());
}

export function getCurrentQueueItemFromQueueState(queueState: QueueState): QueueItem | null {
  return getCurrentQueueItemFromState(queueState);
}

export function usePlayerView() {
  return usePlayerState((state) => state);
}

export function useQueueView() {
  return useQueueSelector((state) => state);
}

export function useSidebarView() {
  return useSidebarStore((state) => state);
}

export function useFileBrowserView() {
  return useFileBrowserSelector((state) => state);
}

export function useVolumeView() {
  return useVolumeStore((state) => state);
}

export function useNotificationsView() {
  return useNotificationsStore((state) => state);
}

export function useSettingsView() {
  return useSettingsStore((state) => state);
}

export function useHotkeysView() {
  return useHotkeysState((state) => state);
}

export function usePlatformView() {
  return usePlatformStore((state) => state);
}

export const appCommands = {
  bootstrapApp,
  loadPlatformInfo
};

export const playbackCommands = {
  bindVideoElement: bindPlaybackVideoElement,
  pausePlayback,
  playNextVideo,
  playPreviousVideo,
  playVideo,
  setFullscreen,
  stopPlayback,
  togglePlayPause
};

export const libraryCommands = {
  handleAddFileEvent,
  handleAddFolderEvent,
  handlePickerResult,
  initializeQueue,
  loadFileSystemStructure,
  navigateToDirectory,
  navigateToParent,
  resetAndBrowseLibrary,
  revealItemInFolder,
  toggleFolder,
  updatePlayerQueueForced
};

export const playerCommands = {
  resetPlayer,
  setCurrentTime,
  setDuration,
  setPlayerState
};

export const queueCommands = {
  addMultipleToQueue: (items: QueueInsertItem[]) => addQueueItems(items),
  addNextToQueue: (item: QueueInsertItem) => addQueueItemNext(item),
  addToQueue: (item: QueueInsertItem) => addQueueItem(item),
  addToQueueAtIndex: (item: QueueInsertItem, index: number) => addQueueItemAtIndex(item, index),
  moveQueueItem,
  removeFromQueue: removeQueueItem,
  resetQueue,
  setQueueRepeatMode,
  shuffleQueue,
  toggleRepeatMode
};

export const sidebarCommands = {
  setSidebarDragging: (isDragging: boolean) =>
    useSidebarStore.getState().setSidebarDragging(isDragging),
  setSidebarDropZone: (dropZoneActive: SidebarPosition | null) =>
    useSidebarStore.getState().setSidebarDropZone(dropZoneActive),
  setSidebarOpen: (isOpen: boolean) => useSidebarStore.getState().setSidebarOpen(isOpen),
  setSidebarPosition: (position: SidebarPosition) =>
    useSidebarStore.getState().setSidebarPosition(position),
  setSidebarTab: (currentTab: SidebarTab) => useSidebarStore.getState().setSidebarTab(currentTab),
  setSidebarWidth: (width: number) => useSidebarStore.getState().setSidebarWidth(width),
  toggleSidebar: () => useSidebarStore.getState().toggleSidebar()
};

export const fileBrowserCommands = {
  setFileBrowserScrollTop,
  setFileBrowserSort,
  setFileBrowserState
};

export const volumeCommands = {
  decreaseVolume: decreaseVolumeWithMediaSync,
  increaseVolume: increaseVolumeWithMediaSync,
  setMuted: setMutedWithMediaSync,
  setVolume: setVolumeWithMediaSync
};

export const settingsCommands = {
  setSettingsDialogOpen: (showDialog: boolean) =>
    useSettingsStore.getState().setSettingsDialogOpen(showDialog)
};

export const notificationCommands = {
  setNotificationSettings: (
    patch: Partial<{
      upNextEnabled: boolean;
      upNextPosition: NotificationPosition;
      videoInfoEnabled: boolean;
    }>
  ) => useNotificationsStore.getState().setNotificationSettings(patch)
};

export const hotkeyCommands = {
  clearStoredHotkeys,
  getStoredHotkeys,
  setHotkeyCategories,
  setStoredHotkeys,
  updateHotkey: updateHotkeyInState
};

export const stateSnapshots = {
  getHotkeysState,
  getNotificationsState: () => useNotificationsStore.getState(),
  getPlatformState: () => usePlatformStore.getState(),
  getPlayerState,
  getQueueState
};

export {
  findFolderInFileSystem,
  normalizeVideoPath,
  toFileUrl,
  transformDirectoryContents,
  updateFolderContents
};

export type { QueueInsertItem };
export type { HotkeyCategory, NotificationPosition, SidebarPosition, SidebarTab };
