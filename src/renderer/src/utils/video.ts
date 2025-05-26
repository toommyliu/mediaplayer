import { playerState } from "@/state.svelte";

export const loadVideoDialog = () => {
  console.log("Loading video dialog...");

  playerState.isLoading = true;
  playerState.error = null;
  playerState.videoSrc = null;

  window.electron.ipcRenderer.send("load-video-file");
};
