import Mousetrap from "mousetrap";
import { runHotkeyAction } from "@/lib/controllers/hotkey-controller";
import { onMediaNextTrack, onMediaPlayPause, onMediaPreviousTrack } from "@/lib/ipc";
import { getPlatformState } from "@/lib/state/platform";
import { getSettingsState } from "@/lib/state/settings";
import { playbackCommands } from "@/lib/store";
import {
  hotkeyCommands,
  stateSnapshots
} from "@/lib/store";
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
      if (getSettingsState().showDialog) return;

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
      void runHotkeyAction(action.id);
    });
  }
}

function bindNumericHotkeys(): void {
  for (let index = 0; index <= 9; index += 1) {
    Mousetrap.unbind(String(index));
    Mousetrap.bind(String(index), (event) => {
      event.preventDefault();
      void runHotkeyAction(`jump-${index}`);
    });
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
  hotkeyCommands.setStoredHotkeys(hotkeys);
  hotkeyCommands.setHotkeyCategories(
    categories.map(cloneCategory),
    stateSnapshots.getHotkeysState().modKey,
    true
  );
}

export function initializeHotkeys(): void {
  if (initialized) return;

  const modKey = getPlatformState().isMac ? "command" : "ctrl";
  categories = buildDefaultCategories(modKey);

  const stored = hotkeyCommands.getStoredHotkeys();
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
  hotkeyCommands.setHotkeyCategories(categories.map(cloneCategory), modKey, true);

  if (!mediaHandlersBound) {
    onMediaPreviousTrack(() => {
      void playbackCommands.playPreviousVideo();
    });
    onMediaNextTrack(() => {
      void playbackCommands.playNextVideo();
    });
    onMediaPlayPause(() => {
      void playbackCommands.togglePlayPause();
    });
    mediaHandlersBound = true;
  }
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
  hotkeyCommands.clearStoredHotkeys();
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
