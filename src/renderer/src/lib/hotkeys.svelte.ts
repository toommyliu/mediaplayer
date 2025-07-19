import Mousetrap from "mousetrap";
import { handlers } from "$/tipc";
import { SidebarTab } from "$/types";
import { fileBrowserState } from "$lib/state/file-browser.svelte";
import { platformState } from "$lib/state/platform.svelte";
import { playerState } from "$lib/state/player.svelte";
import { queue } from "$lib/state/queue.svelte";
import { sidebarState } from "$lib/state/sidebar.svelte";
import { volume } from "$lib/state/volume.svelte";
import { navigateToParent } from "./file-browser.svelte";
import { logger } from "./logger";
import { playNextVideo, playPreviousVideo } from "./video-playback";
import { SEEK_TIME_STEP, VOLUME_STEP } from "./constants";

type HotkeyAction = {
  context?: "file-browser" | "global" | "sidebar" | "video";
  description: string;
  enabled?: boolean;
  handler(event: KeyboardEvent): void;
  id: string;
  keys: string[];
};

type HotkeyCategory = {
  actions: HotkeyAction[];
  name: string;
};

// Configuration state
class HotkeyConfig {
  categories = $state<HotkeyCategory[]>([]);

  modKey = $state<string>("");

  enabled = $state(true);

  private initialized = $state(false);

  public get isInitialized(): boolean {
    return this.initialized;
  }

  public initialize(): void {
    if (this.initialized) return;

    this.modKey = platformState.isMac ? "command" : "ctrl";
    this.initializeDefaultConfig();
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
            context: "video",
            enabled: true
          },
          {
            id: "previousTrack",
            description: "Previous video",
            keys: [`${this.modKey}+left`],
            handler: this.previousVideo,
            context: "video",
            enabled: true
          },
          {
            id: "nextTrack",
            description: "Next video",
            keys: [`${this.modKey}+right`],
            handler: this.nextVideo,
            context: "video",
            enabled: true
          },
          {
            id: "seekBackward",
            description: "Seek backward",
            keys: ["left"],
            handler: this.seekBackward,
            context: "video",
            enabled: true
          },
          {
            id: "seekForward",
            description: "Seek forward",
            keys: ["right"],
            handler: this.seekForward,
            context: "video",
            enabled: true
          },
          {
            id: "volumeUp",
            description: "Volume up",
            keys: ["up"],
            handler: this.volumeUp,
            context: "video",
            enabled: true
          },
          {
            id: "volumeDown",
            description: "Volume down",
            keys: ["down"],
            handler: this.volumeDown,
            context: "video",
            enabled: true
          },
          {
            id: "mute",
            description: "Toggle mute",
            keys: ["m"],
            handler: this.toggleMute,
            context: "video",
            enabled: true
          },
          {
            id: "fullscreen",
            description: "Toggle fullscreen",
            keys: ["f"],
            handler: this.toggleFullscreen,
            context: "video",
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
            context: "global",
            enabled: true
          },
          {
            id: "showQueue",
            description: "Show queue",
            keys: [`${this.modKey}+2`],
            handler: this.showQueue,
            context: "global",
            enabled: true
          },
          {
            id: "toggleSidebar",
            description: "Toggle sidebar",
            keys: [`${this.modKey}+b`],
            handler: this.toggleSidebar,
            context: "global",
            enabled: true
          },
          {
            id: "fileBrowserBack",
            description: "Navigate back in file browser",
            keys: ["alt+left"],
            handler: this.fileBrowserBack,
            context: "file-browser",
            enabled: true
          }
        ]
      },
      {
        name: "Time Navigation",
        actions: []
      }
    ];

    // Add time jump shortcuts (0-9 keys)
    const timeCategory = this.categories.find((c) => c.name === "Time Navigation")!;
    for (let i = 0; i <= 9; i++) {
      timeCategory.actions.push({
        id: `jumpTo${i}0Percent`,
        description: `Jump to ${i * 10}% of video`,
        keys: [`${i}`],
        handler: (ev) => this.jumpToPercent(ev, i / 10),
        context: "video",
        enabled: true
      });
    }
  }

  // Action handlers
  private readonly togglePlayback = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      playerState.isPlaying = !playerState.isPlaying;
      if (playerState.isPlaying) {
        playerState.videoElement?.play().catch(() => {});
      } else {
        playerState.videoElement?.pause();
      }
    }
  };

  private readonly previousVideo = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      playPreviousVideo();
    }
  };

  private readonly nextVideo = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (queue.currentItem) {
      playNextVideo();
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

  private readonly fileBrowserBack = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (!fileBrowserState.currentPath || fileBrowserState.isAtRoot) return;

    navigateToParent().catch((error) => {
      logger.error("Failed to navigate to parent directory:", error);
    });
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

  updateHotkey(actionId: string, newKeys: string[]): boolean {
    for (const category of this.categories) {
      const action = category.actions.find((a) => a.id === actionId);
      if (action) {
        Mousetrap.unbind(action.keys);
        action.keys = newKeys;
        this.bindAction(action);
        return true;
      }
    }

    return false;
  }

  toggleAction(actionId: string, enabled: boolean): boolean {
    console.log(`Toggling action ${actionId} to ${enabled}, from ${this.enabled}`);
    for (const category of this.categories) {
      const action = category.actions.find((a) => a.id === actionId);
      if (action) {
        action.enabled = enabled;
        if (enabled) {
          this.bindAction(action);
        } else {
          Mousetrap.unbind(action.keys);
        }

        return true;
      }
    }

    return false;
  }

  private bindAction(action: HotkeyAction): void {
    // Default to enabled if not explicitly set
    const isEnabled = action.enabled !== false;
    if (!isEnabled) return;

    for (const key of action.keys) {
      Mousetrap.unbind(key);
      Mousetrap.bind(key, (ev) => {
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

    // console.log("Binding all hotkeys...");

    for (const category of this.categories) {
      for (const action of category.actions) {
        // Only bind if action is enabled
        if (action.enabled !== false) {
          this.bindAction(action);
        }
      }
    }
  }

  unbindAll(): void {
    // console.log("Unbinding all hotkeys...");
    for (const action of this.getAllShortcuts()) {
      Mousetrap.unbind(action.keys);
    }
  }

  enable(): void {
    this.enabled = true;
    this.bindAllActions();
  }

  disable(): void {
    this.enabled = false;
    this.unbindAll();
  }

  // Get all shortcuts for display purposes
  public getAllShortcuts(): {
    category: string;
    context?: string;
    description: string;
    enabled: boolean;
    id: string;
    keys: string;
  }[] {
    if (!this.initialized) {
      return [];
    }

    const shortcuts: {
      category: string;
      context?: string;
      description: string;
      enabled: boolean;
      id: string;
      keys: string;
    }[] = [];

    for (const category of this.categories) {
      for (const action of category.actions) {
        shortcuts.push({
          category: category.name,
          id: action.id,
          description: action.description,
          keys: action.keys.join(", "),
          context: action.context,
          enabled: action.enabled !== false
        });
      }
    }

    return shortcuts;
  }
}

export const hotkeyConfig = new HotkeyConfig();

export function setupMediaKeyHandlers(): void {
  handlers.mediaPreviousTrack.listen(() => {
    playPreviousVideo();
  });

  handlers.mediaNextTrack.listen(() => {
    playNextVideo();
  });

  handlers.mediaPlayPause.listen(() => {
    if (queue.currentItem) {
      state.playerState.isPlaying = !state.playerState.isPlaying;
      if (state.playerState.isPlaying) {
        state.playerState.videoElement?.play().catch(() => {});
      } else {
        state.playerState.videoElement?.pause();
      }
    }
  });
}

export function initializeHotkeys(): void {
  hotkeyConfig.initialize(); // Initialize config with platform-specific settings
  setupMediaKeyHandlers();
  hotkeyConfig.bindAllActions();

  // logger.info("Hotkey system initialized with", hotkeyConfig.categories.length, "categories");
}

export function cleanupHotkeys(): void {
  hotkeyConfig.unbindAll();
  logger.info("Hotkey system cleaned up");
}

export type { HotkeyAction, HotkeyCategory };
