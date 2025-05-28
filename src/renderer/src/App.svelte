<script lang="ts">
  import AlertTriangle from "lucide-svelte/icons/alert-triangle";
  import X from "lucide-svelte/icons/x";
  import { Pane, PaneGroup, PaneResizer } from "paneforge";
  import Sidebar from "./components/sidebar.svelte";
  import VideoPlayer from "./components/video-player.svelte";
  import { playerState, sidebarState, platformState } from "./state.svelte";
  import { playVideo } from "./utils/video-playback";

  let fileBrowserEvents: {
    addFile?: (filePath: string) => void;
    addFolder?: (folderData: any) => void;
  } = {};

  window.electron.ipcRenderer.on("add-file-to-browser", async (_ev, filePath) => {
    playVideo(`file://${filePath}`);
    if (fileBrowserEvents.addFile) {
      fileBrowserEvents.addFile(filePath);
    }
  });

  window.electron.ipcRenderer.on("add-folder-to-browser", async (_ev, folderData) => {
    const files = folderData.files.flatMap(function flatten(entry): string[] {
      if ("files" in entry && Array.isArray(entry.files)) {
        return entry.files.flatMap(flatten) ?? [];
      }
      return [`file://${entry.path}`];
    });

    if (files.length > 0) {
      playVideo(files[0]);
      if (fileBrowserEvents.addFolder) {
        fileBrowserEvents.addFolder(folderData);
      }
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const res = await window.electron.ipcRenderer.invoke("get-platform");
    platformState.isWindows = res.isWindows;
    platformState.isMac = res.isMacOS;
    platformState.isLinux = res.isLinux;

    await import("./utils/input.svelte");
  });
</script>

<div class="bg-player-bg text-player-text dark flex h-screen flex-col">
  <div class="flex w-full flex-1 overflow-hidden">
    <PaneGroup direction="horizontal">
      <Pane defaultSize={80}>
        <main class="relative h-full bg-black">
          {#if playerState.error}
            <div
              class="bg-player-error absolute left-1/2 top-4 z-50 flex -translate-x-1/2 transform items-center space-x-2 rounded-lg px-4 py-2 text-white shadow-lg"
            >
              <AlertTriangle size={16} />
              <span>{playerState.error}</span>
              <button
                onclick={() => (playerState.error = null)}
                class="ml-2 rounded px-2 py-1 hover:bg-red-600"
              >
                <X size={14} />
              </button>
            </div>
          {/if}

          <VideoPlayer />
        </main>
      </Pane>

      <PaneResizer class="w-1 cursor-col-resize bg-gray-600 transition-colors hover:bg-gray-500" />

      {#if sidebarState.isOpen}
        <Pane defaultSize={20}>
          <aside class="h-full border-l border-gray-700 bg-gray-800">
            <Sidebar {fileBrowserEvents} />
          </aside>
        </Pane>
      {/if}
    </PaneGroup>
  </div>
</div>
