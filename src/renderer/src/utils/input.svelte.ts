import hotkey from "hotkeys-js";
import * as state from "@/state.svelte";
import { SidebarTab } from "@/types";
import {
  previousVideo,
  nextVideo,
  nextPlaylistVideo,
  previousPlaylistVideo
} from "./video-playback";
import { PlaylistManager } from "./playlist";
import { navigateToParent } from "./file-browser.svelte";

// TODO: use globalShortcuts instead of "mod" key

export const modKey = state.platformState.isMac ? "cmd" : "ctrl";

window.electron.ipcRenderer.on("media-previous-track", () => {
  console.log("Media Previous Track");

  if (state.playerState.currentVideo) {
    previousVideo();
  }
});

window.electron.ipcRenderer.on("media-next-track", () => {
  console.log("Media Next Track");

  if (state.playerState.currentVideo) {
    nextVideo();
  }
});

window.electron.ipcRenderer.on("media-play-pause", () => {
  _togglePlayback();
});

// File Browser
hotkey(`${modKey}+1`, (ev) => {
  ev.preventDefault();
  state.sidebarState.currentTab = SidebarTab.FileBrowser;
});

// Queue
hotkey(`${modKey}+2`, (ev) => {
  ev.preventDefault();
  state.sidebarState.currentTab = SidebarTab.Queue;
});

// Toggle sidebar
hotkey(`${modKey}+b`, (ev) => {
  console.log("press");
  ev.preventDefault();
  state.sidebarState.isOpen = !state.sidebarState.isOpen;
});

function _togglePlayback() {
  if (state.playerState.currentVideo) {
    state.playerState.isPlaying = !state.playerState.isPlaying;
    if (state.playerState.isPlaying) {
      state.playerState.videoElement!.play().catch(() => {});
    } else {
      state.playerState.videoElement!.pause();
    }
  }
}

// Play/pause
hotkey("space", (ev) => {
  ev.preventDefault();
  _togglePlayback();
});

// TODO: configurable seek time

// Seek left
hotkey("left", (ev) => {
  ev.preventDefault();

  if (state.playerState.currentVideo) {
    state.playerState.currentTime = Math.max(0, state.playerState.currentTime - 10);
    state.playerState.videoElement!.currentTime = state.playerState.currentTime;
  }
});

// Seek right
hotkey("right", (ev) => {
  ev.preventDefault();

  if (state.playerState.currentVideo) {
    state.playerState.currentTime = Math.min(
      state.playerState.duration,
      state.playerState.currentTime + 10
    );
    state.playerState.videoElement!.currentTime = state.playerState.currentTime;
  }
});

// Previous track
hotkey(`${modKey}+left`, (ev) => {
  ev.preventDefault();
  if (state.playerState.currentVideo) {
    previousVideo();
  }
});

// Next track
hotkey(`${modKey}+right`, (ev) => {
  ev.preventDefault();
  if (state.playerState.currentVideo) {
    nextVideo();
  }
});

// Playlist navigation - previous track
hotkey("shift+left", (ev) => {
  ev.preventDefault();
  if (state.playerState.currentVideo && state.playlistState.currentPlaylist) {
    previousPlaylistVideo();
  }
});

// Playlist navigation - next track
hotkey("shift+right", (ev) => {
  ev.preventDefault();
  if (state.playerState.currentVideo && state.playlistState.currentPlaylist) {
    nextPlaylistVideo();
  }
});

// Shuffle current playlist
hotkey(`${modKey}+s`, (ev) => {
  ev.preventDefault();
  if (state.playlistState.currentPlaylist) {
    PlaylistManager.shufflePlaylist(state.playlistState.currentPlaylistId);
  }
});

// Clear current playlist
hotkey(`${modKey}+shift+c`, (ev) => {
  ev.preventDefault();
  if (state.playlistState.currentPlaylist) {
    if (confirm("Clear current playlist?")) {
      PlaylistManager.clearPlaylist(state.playlistState.currentPlaylistId);
    }
  }
});

// Digits 0-9 to jump to specific time
for (let idx = 0; idx <= 9; idx++) {
  hotkey(`${idx}`, (ev) => {
    ev.preventDefault();

    if (state.playerState.currentVideo) {
      const jumpTime = (idx / 10) * state.playerState.duration;
      state.playerState.currentTime = jumpTime;
      state.playerState.videoElement!.currentTime = jumpTime;
    }
  });
}

// File browser back navigation
hotkey("alt+left", (ev) => {
  ev.preventDefault();
  if (!state.fileBrowserState.currentPath || state.fileBrowserState.isAtRoot) return;

  navigateToParent().catch((err) => {
    console.error("Failed to navigate to parent directory:", err);
  });
});
