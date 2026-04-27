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
const SEEK_UNDO_EPSILON_SECONDS = 0.001;

function getCurrentPlaybackTime(fallbackTime: number): number {
  const video = getVideoElement();
  return video && Number.isFinite(video.currentTime)
    ? video.currentTime
    : fallbackTime;
}

function setVideoTime(nextTime: number): void {
  if (!Number.isFinite(nextTime))
    return;

  usePlayerStore.getState().setCurrentTime(nextTime);

  const video = getVideoElement();
  if (video)
    video.currentTime = nextTime;
}

function runUndoableSeek(nextTime: number): void {
  if (!Number.isFinite(nextTime))
    return;

  const player = usePlayerStore.getState();
  const currentTime = getCurrentPlaybackTime(player.currentTime);

  if (Math.abs(currentTime - nextTime) < SEEK_UNDO_EPSILON_SECONDS)
    return;

  player.pushSeekUndoTime(currentTime, player.currentVideo);
  setVideoTime(nextTime);
}

export async function runHotkeyAction(actionId: string): Promise<void> {
  const queue = useQueueStore.getState();
  const currentItem = getCurrentQueueItemFromState(queue);
  const player = usePlayerStore.getState();
  const currentTime = getCurrentPlaybackTime(player.currentTime);

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
        const nextTime = Math.max(0, currentTime - SEEK_TIME_STEP);
        runUndoableSeek(nextTime);
      }
      break;
    case "seekForward":
      if (currentItem && Number.isFinite(player.duration)) {
        const nextTime = Math.min(
          player.duration,
          currentTime + SEEK_TIME_STEP,
        );
        runUndoableSeek(nextTime);
      }
      break;
    case "frameBackward":
      if (currentItem) {
        const nextTime = Math.max(0, currentTime - FRAME_TIME_STEP);
        runUndoableSeek(nextTime);
      }
      break;
    case "frameForward":
      if (currentItem && Number.isFinite(player.duration)) {
        const nextTime = Math.min(
          player.duration,
          currentTime + FRAME_TIME_STEP,
        );
        runUndoableSeek(nextTime);
      }
      break;
    case "undoSeek":
      if (currentItem && player.currentVideo) {
        const undoTime = usePlayerStore
          .getState()
          .popSeekUndoTime(player.currentVideo);
        if (undoTime !== null)
          setVideoTime(undoTime);
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
        runUndoableSeek(nextTime);
      }
      break;
  }
}

export function isSidebarOpen(): boolean {
  return useSidebarStore.getState().isOpen;
}
