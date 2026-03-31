import { navigateToParent } from "@/actions/library";
import {
  playNextVideo,
  playPreviousVideo,
  setFullscreen,
  togglePlayPause,
} from "@/actions/playback";
import { FRAME_TIME_STEP, SEEK_TIME_STEP } from "@/lib/constants";
import { useBookmarksStore } from "@/stores/bookmarks";
import { usePlayerStore } from "@/stores/player";
import { getCurrentQueueItemFromState, useQueueStore } from "@/stores/queue";
import { useSettingsStore } from "@/stores/settings";
import { useSidebarStore } from "@/stores/sidebar";
import { useVolumeStore } from "@/stores/volume";
import { getVideoElement } from "@/video-element";

const JUMP_ACTION_REGEX = /^jump-\d$/;

export async function runHotkeyAction(actionId: string): Promise<void> {
  const queue = useQueueStore.getState();
  const currentItem = getCurrentQueueItemFromState(queue);
  const player = usePlayerStore.getState();
  const video = getVideoElement();

  switch (actionId) {
    case "addBookmark":
      if (player.currentVideo) {
        useBookmarksStore.getState().addBookmark(player.currentVideo, player.currentTime);
      }
      break;
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
        usePlayerStore.getState().setCurrentTime(nextTime);
        if (video)
          video.currentTime = nextTime;
      }
      break;
    case "seekForward":
      if (currentItem && Number.isFinite(player.duration)) {
        const nextTime = Math.min(
          player.duration,
          player.currentTime + SEEK_TIME_STEP,
        );
        usePlayerStore.getState().setCurrentTime(nextTime);
        if (video)
          video.currentTime = nextTime;
      }
      break;
    case "frameBackward":
      if (currentItem) {
        const nextTime = Math.max(0, player.currentTime - FRAME_TIME_STEP);
        usePlayerStore.getState().setCurrentTime(nextTime);
        if (video)
          video.currentTime = nextTime;
      }
      break;
    case "frameForward":
      if (currentItem && Number.isFinite(player.duration)) {
        const nextTime = Math.min(
          player.duration,
          player.currentTime + FRAME_TIME_STEP,
        );
        usePlayerStore.getState().setCurrentTime(nextTime);
        if (video)
          video.currentTime = nextTime;
      }
      break;
    case "volumeUp":
      useVolumeStore.getState().increaseVolume();
      break;
    case "volumeDown":
      useVolumeStore.getState().decreaseVolume();
      break;
    case "mute":
      useVolumeStore.getState().setMuted(!useVolumeStore.getState().isMuted);
      break;
    case "fullscreen":
      await setFullscreen(!usePlayerStore.getState().isFullscreen);
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
      if (
        JUMP_ACTION_REGEX.test(actionId)
        && currentItem
        && Number.isFinite(player.duration)
      ) {
        const percent = Number.parseInt(actionId.split("-")[1], 10) / 10;
        const nextTime = percent * player.duration;
        usePlayerStore.getState().setCurrentTime(nextTime);
        if (video)
          video.currentTime = nextTime;
      }
      break;
  }
}

export function isSidebarOpen(): boolean {
  return useSidebarStore.getState().isOpen;
}
