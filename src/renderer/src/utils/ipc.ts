import { playerState } from "@/state.svelte";

export const loadVideoDialog = () => {
  console.log("Loading video dialog...");

  playerState.isLoading = true;
  playerState.error = null;

  window.electron.ipcRenderer.send("load-video-file");
};

export const loadFileBrowser = () => {
  console.log("Loading file browser...");

  return window.electron.ipcRenderer.invoke("start-file-browser");
};
