import { FRAME_TIME_STEP, SEEK_TIME_STEP } from "@/lib/constants";
import { navigateToParent } from "@/lib/controllers/library-controller";
import {
  playNextVideo,
  playPreviousVideo,
  setFullscreen,
  togglePlayPause
} from "@/lib/controllers/playback-controller";
import {
  decreaseVolumeWithMediaSync,
  increaseVolumeWithMediaSync,
  setMutedWithMediaSync
} from "@/lib/controllers/volume-controller";
import { getVideoElement } from "@/lib/controllers/media-runtime";
import { getPlayerState, setCurrentTime } from "@/lib/state/player";
import { getCurrentQueueItemFromState, getQueueState } from "@/lib/state/queue";
import { useSettingsStore } from "@stores/settings";
import { useSidebarStore } from "@stores/sidebar";
import { useVolumeStore } from "@stores/volume";

export async function runHotkeyAction(actionId: string): Promise<void> {
  const queue = getQueueState();
  const currentItem = getCurrentQueueItemFromState(queue);
  const player = getPlayerState();
  const video = getVideoElement();

  switch (actionId) {
    case "playPause":
      await togglePlayPause();
      break;
    case "previousTrack":
      await playPreviousVideo();
      break;
    case "nextTrack":
      await playNextVideo();
      break;
    case "seekBackward":
      if (currentItem) {
        const nextTime = Math.max(0, player.currentTime - SEEK_TIME_STEP);
        setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
    case "seekForward":
      if (currentItem && Number.isFinite(player.duration)) {
        const nextTime = Math.min(player.duration, player.currentTime + SEEK_TIME_STEP);
        setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
    case "frameBackward":
      if (currentItem) {
        const nextTime = Math.max(0, player.currentTime - FRAME_TIME_STEP);
        setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
    case "frameForward":
      if (currentItem && Number.isFinite(player.duration)) {
        const nextTime = Math.min(player.duration, player.currentTime + FRAME_TIME_STEP);
        setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
    case "volumeUp":
      increaseVolumeWithMediaSync();
      break;
    case "volumeDown":
      decreaseVolumeWithMediaSync();
      break;
    case "mute":
      setMutedWithMediaSync(!useVolumeStore.getState().isMuted);
      break;
    case "fullscreen":
      await setFullscreen(!getPlayerState().isFullscreen);
      break;
    case "showFileBrowser":
      useSidebarStore.getState().setSidebarTab("file-browser");
      break;
    case "showQueue":
      useSidebarStore.getState().setSidebarTab("queue");
      break;
    case "toggleSidebar":
      useSidebarStore.getState().toggleSidebar();
      break;
    case "fileBrowserBack":
      await navigateToParent();
      break;
    case "openSettings":
      useSettingsStore.getState().setSettingsDialogOpen(true);
      break;
    default:
      if (/^jump-\d$/.test(actionId) && currentItem && Number.isFinite(player.duration)) {
        const percent = Number.parseInt(actionId.split("-")[1], 10) / 10;
        const nextTime = percent * player.duration;
        setCurrentTime(nextTime);
        if (video) video.currentTime = nextTime;
      }
      break;
  }
}

export function isSidebarOpen(): boolean {
  return useSidebarStore.getState().isOpen;
}
