import * as state from "@/state.svelte";
import { SidebarTab } from "@/types";
import { navigateToParent } from "./file-browser.svelte";
import { PlaylistManager } from "./playlist";
import { playNextVideo, playPreviousVideo } from "./video-playback";
import { handlers } from "@/tipc";
import { logger } from "./logger";
import Mousetrap from "mousetrap";

type HotkeyAction = {
  id: string;
  description: string;
  keys: string[];
  handler: (event: KeyboardEvent) => void;
  context?: "global" | "video" | "sidebar" | "file-browser";
  enabled?: boolean;
};

type HotkeyCategory = {
  name: string;
  actions: HotkeyAction[];
};

// Configuration state
class HotkeyConfig {
  categories = $state<HotkeyCategory[]>([]);
  modKey = $state<string>("");
  seekTime = $state(10);
  volumeStep = $state(0.1);
  enabled = $state(true);

  constructor() {
    this.modKey = state.platformState.isMac ? "cmd" : "ctrl";
    this.initializeDefaultConfig();
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
            context: "video"
          },
          {
            id: "previousTrack",
            description: "Previous video",
            keys: [`${this.modKey}+left`],
            handler: this.previousVideo,
            context: "video"
          },
          {
            id: "nextTrack",
            description: "Next video",
            keys: [`${this.modKey}+right`],
            handler: this.nextVideo,
            context: "video"
          },
          {
            id: "seekBackward",
            description: `Seek backward ${this.seekTime}s`,
            keys: ["left"],
            handler: this.seekBackward,
            context: "video"
          },
          {
            id: "seekForward",
            description: `Seek forward ${this.seekTime}s`,
            keys: ["right"],
            handler: this.seekForward,
            context: "video"
          },
          {
            id: "volumeUp",
            description: "Volume up",
            keys: ["up"],
            handler: this.volumeUp,
            context: "video"
          },
          {
            id: "volumeDown",
            description: "Volume down",
            keys: ["down"],
            handler: this.volumeDown,
            context: "video"
          },
          {
            id: "mute",
            description: "Toggle mute",
            keys: ["m"],
            handler: this.toggleMute,
            context: "video"
          },
          {
            id: "fullscreen",
            description: "Toggle fullscreen",
            keys: ["f"],
            handler: this.toggleFullscreen,
            context: "video"
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
            context: "global"
          },
          {
            id: "showQueue",
            description: "Show queue",
            keys: [`${this.modKey}+2`],
            handler: this.showQueue,
            context: "global"
          },
          {
            id: "toggleSidebar",
            description: "Toggle sidebar",
            keys: [`${this.modKey}+b`],
            handler: this.toggleSidebar,
            context: "global"
          },
          {
            id: "fileBrowserBack",
            description: "Navigate back in file browser",
            keys: ["alt+left"],
            handler: this.fileBrowserBack,
            context: "file-browser"
          }
        ]
      },
      {
        name: "Playlist",
        actions: [
          {
            id: "savePlaylist",
            description: "Save current playlist",
            keys: [`${this.modKey}+s`],
            handler: this.savePlaylist,
            context: "global"
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
        context: "video"
      });
    }
  }

  // Action handlers
  private togglePlayback = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (state.playerState.currentVideo) {
      state.playerState.isPlaying = !state.playerState.isPlaying;
      if (state.playerState.isPlaying) {
        state.playerState.videoElement?.play().catch(() => {});
      } else {
        state.playerState.videoElement?.pause();
      }
    }
  };

  private previousVideo = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (state.playerState.currentVideo) {
      playPreviousVideo();
    }
  };

  private nextVideo = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (state.playerState.currentVideo) {
      playNextVideo();
    }
  };

  private seekBackward = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (state.playerState.currentVideo) {
      const newTime = Math.max(0, state.playerState.currentTime - this.seekTime);
      state.playerState.currentTime = newTime;
      if (state.playerState.videoElement) {
        state.playerState.videoElement.currentTime = newTime;
      }
    }
  };

  private seekForward = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (state.playerState.currentVideo) {
      const newTime = Math.min(
        state.playerState.duration,
        state.playerState.currentTime + this.seekTime
      );
      state.playerState.currentTime = newTime;
      if (state.playerState.videoElement) {
        state.playerState.videoElement.currentTime = newTime;
      }
    }
  };

  private volumeUp = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (state.playerState.videoElement) {
      const newVolume = Math.min(1, state.playerState.volume + this.volumeStep);
      state.playerState.volume = newVolume;
      state.playerState.videoElement.volume = newVolume;
      if (state.playerState.isMuted) {
        state.playerState.isMuted = false;
        state.playerState.videoElement.muted = false;
      }
    }
  };

  private volumeDown = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (state.playerState.videoElement) {
      const newVolume = Math.max(0, state.playerState.volume - this.volumeStep);
      state.playerState.volume = newVolume;
      state.playerState.videoElement.volume = newVolume;
    }
  };

  private toggleMute = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (state.playerState.videoElement) {
      state.playerState.isMuted = !state.playerState.isMuted;
      state.playerState.videoElement.muted = state.playerState.isMuted;
    }
  };

  private toggleFullscreen = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    state.playerState.isFullscreen = !state.playerState.isFullscreen;
    // You might want to add actual fullscreen API calls here
  };

  private showFileBrowser = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    state.sidebarState.currentTab = SidebarTab.FileBrowser;
  };

  private showQueue = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    state.sidebarState.currentTab = SidebarTab.Queue;
  };

  private toggleSidebar = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    state.sidebarState.isOpen = !state.sidebarState.isOpen;
  };

  private fileBrowserBack = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (!state.fileBrowserState.currentPath || state.fileBrowserState.isAtRoot) return;

    navigateToParent().catch((err) => {
      logger.error("Failed to navigate to parent directory:", err);
    });
  };

  private savePlaylist = (ev: KeyboardEvent): void => {
    ev.preventDefault();
    if (state.playlistState.hasUnsavedChanges) {
      PlaylistManager.saveCurrentState();
      logger.info("Playlist saved via keyboard shortcut");
    }
  };

  private jumpToPercent = (ev: KeyboardEvent, percent: number): void => {
    ev.preventDefault();
    if (state.playerState.currentVideo) {
      const jumpTime = percent * state.playerState.duration;
      state.playerState.currentTime = jumpTime;
      if (state.playerState.videoElement) {
        state.playerState.videoElement.currentTime = jumpTime;
      }
    }
  };

  // Configuration methods
  updateSeekTime(newTime: number): void {
    this.seekTime = newTime;
    // Update descriptions
    const playbackCategory = this.categories.find((c) => c.name === "Playback");
    if (playbackCategory) {
      const seekBackward = playbackCategory.actions.find((a) => a.id === "seekBackward");
      const seekForward = playbackCategory.actions.find((a) => a.id === "seekForward");
      if (seekBackward) seekBackward.description = `Seek backward ${newTime}s`;
      if (seekForward) seekForward.description = `Seek forward ${newTime}s`;
    }
  }

  updateVolumeStep(newStep: number): void {
    this.volumeStep = Math.max(0.01, Math.min(0.5, newStep));
  }

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
    if (action.enabled === false) return;

    action.keys.forEach((key) => {
      Mousetrap.unbind(key);
      Mousetrap.bind(key, (ev) => {
        logger.info(`Hotkey pressed: ${action.id} (${key})`);
        ev.preventDefault();
        action.handler(ev);
      });
    });
  }

  bindAllActions(): void {
    if (!this.enabled) {
      console.warn("Hotkeys are disabled, not binding actions.");
      return;
    }
    console.log("Binding all hotkeys...");

    for (const category of this.categories) {
      for (const action of category.actions) {
        this.bindAction(action);
      }
    }
  }

  unbindAll(): void {
    console.log("Unbinding all hotkeys...");
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

  // Export/import configuration
  exportConfig(): {
    seekTime: number;
    volumeStep: number;
    categories: Array<{
      name: string;
      actions: Array<{
        id: string;
        description: string;
        keys: string[];
        context?: string;
        enabled?: boolean;
      }>;
    }>;
  } {
    return {
      seekTime: this.seekTime,
      volumeStep: this.volumeStep,
      categories: this.categories.map((category) => ({
        name: category.name,
        actions: category.actions.map((action) => ({
          id: action.id,
          description: action.description,
          keys: action.keys,
          context: action.context,
          enabled: action.enabled
        }))
      }))
    };
  }

  importConfig(config: {
    seekTime?: number;
    volumeStep?: number;
    categories?: Array<{
      name: string;
      actions: Array<{
        id: string;
        keys?: string[];
        enabled?: boolean;
      }>;
    }>;
  }): void {
    if (config.seekTime) this.updateSeekTime(config.seekTime);
    if (config.volumeStep) this.updateVolumeStep(config.volumeStep);

    if (config.categories) {
      for (const categoryConfig of config.categories) {
        const category = this.categories.find((c) => c.name === categoryConfig.name);
        if (category) {
          for (const actionConfig of categoryConfig.actions) {
            const action = category.actions.find((a) => a.id === actionConfig.id);
            if (action) {
              if (actionConfig.keys) action.keys = actionConfig.keys;
              if (typeof actionConfig.enabled === "boolean") action.enabled = actionConfig.enabled;
            }
          }
        }
      }
    }

    this.bindAllActions();
  }

  // Get all shortcuts for display purposes
  getAllShortcuts(): Array<{
    category: string;
    id: string;
    description: string;
    keys: string;
    context?: string;
    enabled: boolean;
  }> {
    const shortcuts: Array<{
      category: string;
      id: string;
      description: string;
      keys: string;
      context?: string;
      enabled: boolean;
    }> = [];

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
    if (state.playerState.currentVideo) {
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
  setupMediaKeyHandlers();
  hotkeyConfig.bindAllActions();

  logger.info("Hotkey system initialized with", hotkeyConfig.categories.length, "categories");
}

export function cleanupHotkeys(): void {
  hotkeyConfig.unbindAll();
  logger.info("Hotkey system cleaned up");
}

export type { HotkeyAction, HotkeyCategory };
