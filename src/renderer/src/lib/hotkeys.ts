import Mousetrap from "mousetrap";
import { handlers } from "@/lib/tipc";
import { FRAME_TIME_STEP, SEEK_TIME_STEP } from "@/lib/constants";
import { useAppStore, getCurrentQueueItem } from "@/lib/store";
import type { HotkeyAction, HotkeyCategory } from "@/types";

let categories: HotkeyCategory[] = [];
let initialized = false;
let mediaHandlersBound = false;

function buildDefaultCategories(modKey: string): HotkeyCategory[] {
  return [
    {
      actions: [
        { description: "Play/Pause video", id: "playPause", keys: ["space"] },
        { description: "Previous video", id: "previousTrack", keys: [`${modKey}+left`] },
        { description: "Next video", id: "nextTrack", keys: [`${modKey}+right`] },
        { description: "Seek backward", id: "seekBackward", keys: ["left"] },
        { description: "Seek forward", id: "seekForward", keys: ["right"] },
        { description: "Frame backward", id: "frameBackward", keys: [","] },
        { description: "Frame forward", id: "frameForward", keys: ["."] },
        { description: "Volume up", id: "volumeUp", keys: ["up"] },
        { description: "Volume down", id: "volumeDown", keys: ["down"] },
        { description: "Toggle mute", id: "mute", keys: ["m"] },
        { description: "Toggle fullscreen", id: "fullscreen", keys: ["f"] }
      ],
      name: "Playback"
    },
    {
      actions: [
        { description: "Show file browser", id: "showFileBrowser", keys: [`${modKey}+1`] },
        { description: "Show queue", id: "showQueue", keys: [`${modKey}+2`] },
        { description: "Toggle sidebar", id: "toggleSidebar", keys: [`${modKey}+b`] },
        { description: "Navigate back in file browser", id: "fileBrowserBack", keys: ["alt+left"] }
      ],
      name: "Navigation"
    },
    {
      actions: [],
      name: "Time Navigation"
    },
    {
      actions: [
        {
          configurable: false,
          description: "Open settings",
          id: "openSettings",
          keys: [`${modKey}+,`]
        }
      ],
      name: "Application"
    }
  ];
}

function bindAction(action: HotkeyAction): void {
  const isEnabled = action.enabled !== false;
  if (!isEnabled) return;

  for (const key of action.keys) {
    Mousetrap.unbind(key);
    Mousetrap.bind(key, (event) => {
      const state = useAppStore.getState();

      if (state.settings.showDialog) return;

      const target =
        (event.target as HTMLElement | null) || (document.activeElement as HTMLElement | null);
      const elementToCheck = (document.activeElement as HTMLElement | null) || target;
      if (elementToCheck) {
        const tagName = elementToCheck.tagName;
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          elementToCheck.isContentEditable
        ) {
          return;
        }
      }

      event.preventDefault();
      void runAction(action.id);
    });
  }
}

async function runAction(actionId: string): Promise<void> {
  const store = useAppStore.getState();
  const state = useAppStore.getState();
  const currentItem = getCurrentQueueItem(state);
  const video = document.querySelector("video");

  switch (actionId) {
    case "playPause":
      await store.togglePlayPause();
      break;
    case "previousTrack":
      await store.playPreviousVideo();
      break;
    case "nextTrack":
      await store.playNextVideo();
      break;
    case "seekBackward":
      if (currentItem) {
        const nextTime = Math.max(0, state.player.currentTime - SEEK_TIME_STEP);
        store.setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
    case "seekForward":
      if (currentItem) {
        const nextTime = Math.min(state.player.duration, state.player.currentTime + SEEK_TIME_STEP);
        store.setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
    case "frameBackward":
      if (currentItem) {
        const nextTime = Math.max(0, state.player.currentTime - FRAME_TIME_STEP);
        store.setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
    case "frameForward":
      if (currentItem) {
        const nextTime = Math.min(state.player.duration, state.player.currentTime + FRAME_TIME_STEP);
        store.setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
    case "volumeUp":
      store.increaseVolume();
      break;
    case "volumeDown":
      store.decreaseVolume();
      break;
    case "mute":
      store.setMuted(!state.volume.isMuted);
      break;
    case "fullscreen":
      await store.setFullscreen(!state.player.isFullscreen);
      break;
    case "showFileBrowser":
      store.setSidebarTab("file-browser");
      break;
    case "showQueue":
      store.setSidebarTab("queue");
      break;
    case "toggleSidebar":
      store.toggleSidebar();
      break;
    case "fileBrowserBack":
      await store.navigateToParent();
      break;
    case "openSettings":
      store.setSettingsDialogOpen(true);
      break;
    default:
      if (/^jump-\d$/.test(actionId) && currentItem) {
        const percent = Number.parseInt(actionId.split("-")[1], 10) / 10;
        const nextTime = percent * state.player.duration;
        store.setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
  }
}

function bindNumericHotkeys(): void {
  for (let index = 0; index <= 9; index += 1) {
    Mousetrap.unbind(String(index));
    Mousetrap.bind(String(index), (event) => {
      event.preventDefault();
      void runAction(`jump-${index}`);
    });
  }
}

export function initializeHotkeys(): void {
  if (initialized) return;

  const modKey = useAppStore.getState().platform.isMac ? "command" : "ctrl";
  categories = buildDefaultCategories(modKey);

  const stored = useAppStore.getState().getStoredHotkeys();
  if (stored) {
    for (const category of categories) {
      for (const action of category.actions) {
        if (stored[action.id]) {
          action.keys = stored[action.id];
        }
      }
    }
  }

  for (const category of categories) {
    for (const action of category.actions) {
      bindAction(action);
    }
  }

  bindNumericHotkeys();
  initialized = true;
  useAppStore.getState().setHotkeyCategories(categories.map(cloneCategory), modKey, true);

  if (!mediaHandlersBound) {
    handlers.mediaPreviousTrack.listen(() => {
      void useAppStore.getState().playPreviousVideo();
    });
    handlers.mediaNextTrack.listen(() => {
      void useAppStore.getState().playNextVideo();
    });
    handlers.mediaPlayPause.listen(() => {
      void useAppStore.getState().togglePlayPause();
    });
    mediaHandlersBound = true;
  }
}

function cloneCategory(category: HotkeyCategory): HotkeyCategory {
  return {
    actions: category.actions.map((action) => ({ ...action, keys: [...action.keys] })),
    name: category.name
  };
}

function persistCurrentHotkeys(): void {
  const hotkeys: Record<string, string[]> = {};
  for (const category of categories) {
    for (const action of category.actions) {
      hotkeys[action.id] = action.keys;
    }
  }
  useAppStore.getState().setStoredHotkeys(hotkeys);
  useAppStore
    .getState()
    .setHotkeyCategories(
      categories.map(cloneCategory),
      useAppStore.getState().hotkeys.modKey,
      true
    );
}

export function updateHotkey(actionId: string, newKeys: string[]): boolean {
  for (const category of categories) {
    const action = category.actions.find((currentAction) => currentAction.id === actionId);
    if (!action) continue;
    if (action.configurable === false) return false;

    for (const key of action.keys) {
      Mousetrap.unbind(key);
    }

    action.keys = newKeys;
    bindAction(action);
    persistCurrentHotkeys();
    return true;
  }

  return false;
}

export function resetHotkeysToDefaults(): void {
  cleanupHotkeys();
  useAppStore.getState().clearStoredHotkeys();
  initialized = false;
  initializeHotkeys();
}

export function cleanupHotkeys(): void {
  for (const category of categories) {
    for (const action of category.actions) {
      for (const key of action.keys) {
        Mousetrap.unbind(key);
      }
    }
  }

  for (let index = 0; index <= 9; index += 1) {
    Mousetrap.unbind(String(index));
  }
}
