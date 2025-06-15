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
    console.log(
      state.platformState.isMac ? "Using Mac modifier keys" : "Using non-Mac modifier keys"
    );
    this.modKey = state.platformState.isMac ? "command" : "ctrl";
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
            description: `Seek backward ${this.seekTime}s`,
            keys: ["left"],
            handler: this.seekBackward,
            context: "video",
            enabled: true
          },
          {
            id: "seekForward",
            description: `Seek forward ${this.seekTime}s`,
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
        name: "Playlist",
        actions: [
          {
            id: "savePlaylist",
            description: "Save current playlist",
            keys: [`${this.modKey}+s`],
            handler: this.savePlaylist,
            context: "global",
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
    console.log("showFileBrowser");
    ev.preventDefault();
    state.sidebarState.currentTab = SidebarTab.FileBrowser;
  };

  private showQueue = (ev: KeyboardEvent): void => {
    console.log("showQueue");
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
        // Only bind if action is enabled
        if (action.enabled !== false) {
          this.bindAction(action);
        }
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
  console.log("Initializing hotkeys...");
  setupMediaKeyHandlers();
  hotkeyConfig.bindAllActions();

  logger.info("Hotkey system initialized with", hotkeyConfig.categories.length, "categories");
}

export function cleanupHotkeys(): void {
  hotkeyConfig.unbindAll();
  logger.info("Hotkey system cleaned up");
}

export type { HotkeyAction, HotkeyCategory };
