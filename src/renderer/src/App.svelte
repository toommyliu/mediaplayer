<script lang="ts">
  import VideoPlayer from "./components/VideoPlayer.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import { PaneGroup, Pane, PaneResizer } from "paneforge";
  import { playerState, sidebarState } from "./state.svelte";
  import { AlertTriangle, X } from "lucide-svelte";

  let videoElement = $state<HTMLVideoElement | null>(null);

  window.electron.ipcRenderer.on("video-file-loaded", async (_ev, filePaths: string[]) => {
    console.log("Received filePaths:", filePaths);
    playerState.error = null;
    playerState.isLoading = true;

    if (filePaths.length >= 1) {
      console.log(`Loading video files: ${filePaths}`);

      playerState.queue = filePaths.map((path) => `file://${path}`);
      playerState.currentIndex = 0;
    }
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

          <VideoPlayer bind:videoElement />
        </main>
      </Pane>

      <PaneResizer class="w-1 cursor-col-resize bg-gray-600 transition-colors hover:bg-gray-500" />

      {#if sidebarState.isOpen}
        <Pane defaultSize={20}>
          <aside class="h-full border-l border-gray-700 bg-gray-800">
            <Sidebar />
          </aside>
        </Pane>
      {/if}
    </PaneGroup>
  </div>
</div>
