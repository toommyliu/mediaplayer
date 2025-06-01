<script lang="ts">
  import AlertTriangle from "lucide-svelte/icons/alert-triangle";
  import X from "lucide-svelte/icons/x";
  import { Pane, PaneGroup, PaneResizer } from "paneforge";
  import Sidebar from "./components/sidebar.svelte";
  import VideoPlayer from "./components/video-player.svelte";
  import { playerState, sidebarState, platformState, fileBrowserState } from "./state.svelte";
  import { playVideo } from "./utils/video-playback";
  import { client } from "./client";
  import { transformDirectoryContents } from "./utils/file-browser.svelte";

  // TODO: this should use tipc
  window.electron.ipcRenderer.on("add-file-to-browser", async (_ev, filePath) => {
    playVideo(`file://${filePath}`);
  });

  window.electron.ipcRenderer.on("add-folder-to-browser", async (_ev, folderData) => {
    try {
      fileBrowserState.error = null;
      const result = folderData;
      console.log("loadFileBrowser result:", result);

      if (result && result.rootPath) {
        fileBrowserState.originalPath = result.rootPath;

        // Reset player state
        playerState.currentTime = 0;
        playerState.duration = 0;
        playerState.isPlaying = false;
        playerState.currentIndex = 0;
        playerState.queue = [];
        if (playerState.videoElement) {
          playerState.videoElement.pause();
        }

        // Navigate to the directory
        const dirResult = await client.readDirectory(result.rootPath);
        if (dirResult) {
          fileBrowserState.fileTree = {
            rootPath: dirResult.currentPath,
            files: transformDirectoryContents(dirResult)
          };
          fileBrowserState.currentPath = dirResult.currentPath;
          fileBrowserState.isAtRoot = dirResult.isAtRoot;

          // Update the queue but don't auto-play
          const videos = fileBrowserState.fileSystem.flatMap(function flatten(entry): string[] {
            if (entry.files) {
              return entry.files?.flatMap(flatten) ?? [];
            }
            if (entry.path && entry.duration !== undefined) {
              return [`file://${entry.path}`];
            }
            return [];
          });

          if (videos.length > 0) {
            playerState.queue = videos;
            playerState.currentIndex = 0;
            // Don't auto-play - let user manually select a video
          }
        } else if (result === null) {
          fileBrowserState.error = null;
          fileBrowserState.fileTree = null;
          fileBrowserState.currentPath = null;
          fileBrowserState.isAtRoot = false;
          fileBrowserState.originalPath = null;
        } else {
          fileBrowserState.error = "No video files found in the selected folder";
          fileBrowserState.fileTree = null;
          fileBrowserState.currentPath = null;
          fileBrowserState.isAtRoot = false;
          fileBrowserState.originalPath = null;
        }
      }
    } catch (err) {
      console.error("Failed to load file system:", err);
      fileBrowserState.error = "Failed to load file system. Please try again.";
      fileBrowserState.fileTree = null;
      fileBrowserState.currentPath = null;
      fileBrowserState.isAtRoot = false;
      fileBrowserState.originalPath = null;
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const res = await client.getPlatform();
    platformState.isWindows = res.isWindows;
    platformState.isMac = res.isMacOS;
    platformState.isLinux = res.isLinux;

    await import("./utils/input.svelte");
  });
</script>

<div class="dark flex h-screen flex-col">
  <div class="flex w-full flex-1 overflow-hidden">
    <PaneGroup direction="horizontal">
      <Pane defaultSize={80}>
        <main class="relative h-full">
          {#if playerState.error}
            <div
              class="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 transform items-center space-x-2 rounded-lg px-4 py-2 text-white shadow-lg"
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
          <aside class="h-full border-l border-gray-700">
            <Sidebar />
          </aside>
        </Pane>
      {/if}
    </PaneGroup>
  </div>
</div>
