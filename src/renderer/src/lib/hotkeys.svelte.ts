import Mousetrap from "mousetrap";
import { handlers } from "$/tipc";
import { SidebarTab } from "$/types";
import { fileBrowserState } from "$lib/state/file-browser.svelte";
import { platformState } from "$lib/state/platform.svelte";
import { playerState } from "$lib/state/player.svelte";
import { queue } from "$lib/state/queue.svelte";
import { sidebarState } from "$lib/state/sidebar.svelte";
import { settings } from "$lib/state/settings.svelte";
import { volume } from "$lib/state/volume.svelte";
import { SEEK_TIME_STEP, VOLUME_STEP, FRAME_TIME_STEP } from "./constants";
import { logger } from "./logger";

type HotkeyAction = {
  description: string;
  enabled?: boolean;
  handler(event: KeyboardEvent): void;
  id: string;
  keys: string[];
  configurable?: boolean; // whether a user can change this hotkey via the UI
};

type HotkeyCategory = {
  actions: HotkeyAction[];
  name: string;
};

class HotkeyConfig {
  public categories = $state<HotkeyCategory[]>([]);

  public modKey = $state<string>("");

  public enabled = $state(true);

  private initialized = $state(false);

  public get isInitialized(): boolean {
    return this.initialized;
  }

  public initialize(): void {
    if (this.initialized) return;

    this.modKey = platformState.isMac ? "command" : "ctrl";
    this.initializeDefaultConfig();
    this.saveHotkeys();
    this.initialized = true;
  }

  private initializeDefaultConfig(): void {
    this.categories = [
      {
        name: "Playback",
        actions: [
          {
            id: "playPause",
            description: "Play/Pause video",
            keys: ["space"],
            handler: this.togglePlayback,
            enabled: true
          },
          {
            id: "previousTrack",
            description: "Previous video",
            keys: [`${this.modKey}+left`],
            handler: this.previousVideo,
            enabled: true
          },
          {
            id: "nextTrack",
            description: "Next video",
            keys: [`${this.modKey}+right`],
            handler: this.nextVideo,
            enabled: true
          },
          {
            id: "seekBackward",
            description: "Seek backward",
            keys: ["left"],
            handler: this.seekBackward,
            enabled: true
          },
          {
            id: "seekForward",
            description: "Seek forward",
            keys: ["right"],
            handler: this.seekForward,
            enabled: true
          },
          {
            id: "frameBackward",
            description: "Frame backward",
            keys: [","],
            handler: this.frameBackward,
            enabled: true
          },
          {
            id: "frameForward",
            description: "Frame forward",
            keys: ["."],
            handler: this.frameForward,
            enabled: true
          },
          {
            id: "volumeUp",
            description: "Volume up",
            keys: ["up"],
            handler: this.volumeUp,
            enabled: true
          },
          {
            id: "volumeDown",
            description: "Volume down",
            keys: ["down"],
            handler: this.volumeDown,
            enabled: true
          },
          {
            id: "mute",
            description: "Toggle mute",
            keys: ["m"],
            handler: this.toggleMute,
            enabled: true
          },
          {
            id: "fullscreen",
            description: "Toggle fullscreen",
            keys: ["f"],
            handler: this.toggleFullscreen,
            enabled: true
          }
        ]
      },
      {
        name: "Navigation",
        actions: [
          {
            id: "showFileBrowser",
            description: "Show file browser",
            keys: [`${this.modKey}+1`],
            handler: this.showFileBrowser,
            enabled: true
          },
          {
            id: "showQueue",
            description: "Show queue",
            keys: [`${this.modKey}+2`],
            handler: this.showQueue,
            enabled: true
          },
          {
            id: "toggleSidebar",
            description: "Toggle sidebar",
            keys: [`${this.modKey}+b`],
            handler: this.toggleSidebar,
            enabled: true
          },
          {
            id: "fileBrowserBack",
            description: "Navigate back in file browser",
            keys: ["alt+left"],
            handler: this.fileBrowserBack,
            enabled: true
          }
        ]
      },
      {
        name: "Time Navigation",
        actions: []
      },
      {
        name: "Application",
        actions: [
          {
            id: "openSettings",
            description: "Open settings",
            keys: [`${this.modKey}+,`],
            handler: this.openSettings,
            enabled: true,
            configurable: false
          }
        ]
      }
    ];

    // Load saved hotkeys and apply them
    const saved = this.loadHotkeys();
    if (saved) {
      for (const category of this.categories) {
        for (const action of category.actions) {
          if (saved[action.id]) {
            action.keys = saved[action.id];
          }
        }
      }
    }

    // Jump to percentage hotkeys
    for (let idx = 0; idx <= 9; idx++) {
      Mousetrap.bind(String(idx), (ev) => {
        ev.preventDefault();
        this.jumpToPercent(ev, idx / 10);
      });
    }
  }

  private saveHotkeys(): void {
    const hotkeys: Record<string, string[]> = {};
    for (const category of this.categories) {
      for (const action of category.actions) {
        hotkeys[action.id] = action.keys;
      }
    }
    localStorage.setItem("mediaplayer-hotkeys", JSON.stringify(hotkeys));
  }

  private loadHotkeys(): Record<string, string[]> | null {
    const stored = localStorage.getItem("mediaplayer-hotkeys");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Action handlers
  private readonly togglePlayback = async (ev: KeyboardEvent): Promise<void> => {
    ev.preventDefault();
    if (queue.currentItem) {
      playerState.isPlaying = !playerState.isPlaying;
      if (playerState.isPlaying) {
        try {
          await playerState.videoElement?.play();
        } catch (e) {
          /* ignore */
        }
      } else {
        playerState.videoElement?.pause();
      }
    }
  };

  private readonly previousVideo = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      playerState.playPreviousVideo();
    }
  };

  private readonly nextVideo = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      playerState.playNextVideo();
    }
  };

  private readonly seekBackward = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      const newTime = Math.max(0, playerState.currentTime - SEEK_TIME_STEP);
      playerState.currentTime = newTime;
      if (playerState.videoElement) {
        playerState.videoElement.currentTime = newTime;
      }
    }
  };

  private readonly seekForward = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      const newTime = Math.min(playerState.duration, playerState.currentTime + SEEK_TIME_STEP);
      playerState.currentTime = newTime;
      if (playerState.videoElement) {
        playerState.videoElement.currentTime = newTime;
      }
    }
  };

  private readonly frameBackward = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      const newTime = Math.max(0, playerState.currentTime - FRAME_TIME_STEP);
      playerState.currentTime = newTime;
      if (playerState.videoElement) {
        playerState.videoElement.currentTime = newTime;
      }
    }
  };

  private readonly frameForward = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      const newTime = Math.min(playerState.duration, playerState.currentTime + FRAME_TIME_STEP);
      playerState.currentTime = newTime;
      if (playerState.videoElement) {
        playerState.videoElement.currentTime = newTime;
      }
    }
  };

  private readonly volumeUp = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (playerState.videoElement) {
      const newVolume = Math.min(1, volume.value + VOLUME_STEP);
      volume.value = newVolume;
      volume.isMuted = false;
    }
  };

  private readonly volumeDown = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (playerState.videoElement) {
      const newVolume = Math.max(0, volume.value - VOLUME_STEP);
      volume.value = newVolume;
      volume.isMuted = newVolume === 0;
    }
  };

  private readonly toggleMute = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (playerState.videoElement) {
      volume.isMuted = !volume.isMuted;
    }
  };

  private readonly toggleFullscreen = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    playerState.isFullscreen = !playerState.isFullscreen;
  };

  private readonly showFileBrowser = (ev: KeyboardEvent): void => {
    console.log("showFileBrowser");
    ev.preventDefault();
    sidebarState.currentTab = SidebarTab.FileBrowser;
  };

  private readonly showQueue = (ev: KeyboardEvent): void => {
    console.log("showQueue");
    ev.preventDefault();
    sidebarState.currentTab = SidebarTab.Queue;
  };

  private readonly toggleSidebar = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    sidebarState.isOpen = !sidebarState.isOpen;
  };

  private readonly fileBrowserBack = async (ev: KeyboardEvent): Promise<void> => {
    ev.preventDefault();
    if (!fileBrowserState.currentPath || fileBrowserState.isAtRoot) return;
    try {
      await fileBrowserState.navigateToParent();
    } catch (error) {
      logger.error("Failed to navigate to parent directory:", error);
    }
  };

  private readonly openSettings = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    // Open the settings dialog
    settings.showDialog = true;
  };

  private readonly jumpToPercent = (ev: KeyboardEvent, percent: number): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      const jumpTime = percent * playerState.duration;
      playerState.currentTime = jumpTime;
      if (playerState.videoElement) {
        playerState.videoElement.currentTime = jumpTime;
      }
    }
  };

  public updateHotkey(actionId: string, newKeys: string[]): boolean {
    for (const category of this.categories) {
      const action = category.actions.find((a) => a.id === actionId);
      if (action) {
        // Do not allow changes to non-configurable actions
        if (action.configurable === false) return false;
        if (Array.isArray(action.keys)) {
          for (const key of action.keys) {
            Mousetrap.unbind(key);
          }
        }
        action.keys = newKeys;
        this.bindAction(action);
        this.saveHotkeys();
        return true;
      }
    }

    return false;
  }

  public resetToDefaults(): void {
    // Clear out existing bindings and saved hotkey configuration so we truly
    // restore to the app defaults when reinitializing.
    this.unbindAll();
    this.categories = [];
    // Remove any saved overrides from localStorage so initializeDefaultConfig
    // won't re-apply saved hotkeys over the defaults.
    try {
      localStorage.removeItem("mediaplayer-hotkeys");
    } catch (e) {}
    this.initializeDefaultConfig();
    this.bindAllActions();
    this.saveHotkeys();
  }

  private bindAction(action: HotkeyAction): void {
    // Default to enabled if not explicitly set
    const isEnabled = action.enabled !== false;
    if (!isEnabled) return;
    for (const key of action.keys) {
      Mousetrap.unbind(key);
      Mousetrap.bind(key, (ev) => {
        // If any settings dialog is open, let the dialog handle key events rather than global hotkeys
        if (settings.showDialog) return;

        // If focus is inside a dialog or a form control, skip global hotkeys so the dialog/input
        // can handle keyboard events (e.g., arrow keys to scroll a list).
        try {
          const target =
            (ev.target as HTMLElement | null) || (document.activeElement as HTMLElement | null);
          const active = document.activeElement as HTMLElement | null;
          // prefer checking the activeElement if present
          const elToCheck = active || target;
          if (elToCheck) {
            // Skip if inside dialog content
            if (elToCheck.closest('[data-slot="dialog-content"]')) {
              return;
            }

            // Skip if focus is a form control or contenteditable
            const tagName = elToCheck.tagName;
            if (
              tagName === "INPUT" ||
              tagName === "TEXTAREA" ||
              tagName === "SELECT" ||
              (elToCheck as HTMLElement).isContentEditable
            ) {
              return;
            }
          }
        } catch (e) {
          /* ignore */
        }
        ev.preventDefault();
        action.handler(ev);
      });
    }
  }

  public bindAllActions(): void {
    if (!this.initialized) {
      console.warn("Hotkeys not initialized yet, skipping binding");
      return;
    }

    if (!this.enabled) {
      console.warn("Hotkeys are disabled, not binding actions.");
      return;
    }

    for (const category of this.categories) {
      for (const action of category.actions) {
        if (action.enabled !== false) {
          this.bindAction(action);
        }
      }
    }
  }

  public unbindAll(): void {
    // Unbind all keys bound for the actions in the categories, including
    // numeric percentage keys (0-9) which are bound separately.
    for (const category of this.categories) {
      for (const action of category.actions) {
        for (const key of action.keys) {
          Mousetrap.unbind(key);
        }
      }
    }
    for (let idx = 0; idx <= 9; idx++) {
      Mousetrap.unbind(String(idx));
    }
  }

  // Get all shortcuts for display purposes
  public getAllShortcuts(): {
    category: string;
    description: string;
    enabled: boolean;
    id: string;
    keys: string;
    configurable?: boolean;
  }[] {
    if (!this.initialized) {
      return [];
    }

    const shortcuts: {
      category: string;
      description: string;
      enabled: boolean;
      id: string;
      keys: string;
      configurable?: boolean;
    }[] = [];

    for (const category of this.categories) {
      for (const action of category.actions) {
        shortcuts.push({
          category: category.name,
          id: action.id,
          description: action.description,
          keys: action.keys.join(", "),
          enabled: action.enabled !== false,
          configurable: action.configurable
        });
      }
    }

    return shortcuts;
  }
}

export const hotkeyConfig = new HotkeyConfig();

export function setupMediaKeyHandlers(): void {
  handlers.mediaPreviousTrack.listen(() => {
    playerState.playPreviousVideo();
  });
  handlers.mediaNextTrack.listen(() => {
    playerState.playNextVideo();
  });
  handlers.mediaPlayPause.listen(async () => {
    if (queue.currentItem) {
      playerState.isPlaying = !playerState.isPlaying;
      if (playerState.isPlaying) {
        try {
          await playerState.videoElement?.play();
        } catch (e) {}
      } else {
        playerState.videoElement?.pause();
      }
    }
  });
}

export function initializeHotkeys(): void {
  hotkeyConfig.initialize();
  setupMediaKeyHandlers();
  hotkeyConfig.bindAllActions();
}

export function cleanupHotkeys(): void {
  hotkeyConfig.unbindAll();
  logger.info("Hotkey system cleaned up");
}

export type { HotkeyAction, HotkeyCategory };
