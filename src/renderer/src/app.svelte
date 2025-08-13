<script lang="ts">
  import AlertTriangle from "lucide-svelte/icons/alert-triangle";
  import IconX from "lucide-svelte/icons/x";
  import { ModeWatcher } from "mode-watcher";
  import { Pane, PaneGroup, PaneResizer } from "paneforge";
  import { onMount } from "svelte";
  import Sidebar from "$components/sidebar.svelte";
  import VideoPlayer from "$components/video-player/video-player.svelte";
  import { logger } from "$lib/logger";
  import { QueueManager } from "$lib/queue-manager";
  import { fileBrowserState } from "$lib/state/file-browser.svelte";
  import { platformState } from "$lib/state/platform.svelte";
  import { playerState } from "$lib/state/player.svelte";
  import { sidebarState } from "$lib/state/sidebar.svelte";
  import { client, handlers } from "./tipc";

  QueueManager.initialize();

  handlers.addFile.listen(async (res) => {
    logger.debug("addFile:", res);
    if (res.type === "file") {
      // Clear the queue and add the selected file
      QueueManager.clearQueue();
      QueueManager.addToQueue({
        name: res.path.split("/").pop() ?? "Video",
        path: res.path
      });

      playerState.playVideo(`file://${res.path}`);
    }
  });

  handlers.addFolder.listen(async (folderData) => {
    try {
      fileBrowserState.error = null;
      const result = folderData;
      console.log("loadFileBrowser result:", result);

      if (!result) {
        console.log("No result received from loadFileBrowser");
        return;
      }

      if (result.type === "file") {
        console.log("Adding single file to queue:", result.path);

        QueueManager.clearQueue();
        QueueManager.addToQueue({
          name: result.path || (result.path.split("/").pop() ?? "Video"),
          path: result.path
        });
      } else if (result.type === "folder") {
        fileBrowserState.originalPath = result.rootPath;

        playerState.currentTime = 0;
        playerState.duration = 0;
        playerState.isPlaying = false;
        if (playerState.videoElement) {
          playerState.videoElement.pause();
        }

        const dirResult = await client.readDirectory(result.rootPath);
        if (dirResult) {
          fileBrowserState.fileTree = {
            rootPath: dirResult.currentPath,
            files: fileBrowserState.transformDirectoryContents(dirResult)
          };
          fileBrowserState.currentPath = dirResult.currentPath;
          fileBrowserState.isAtRoot = dirResult.isAtRoot;

          const allVideoFiles = await fileBrowserState.getAllVideoFilesRecursive(result.rootPath);
          if (allVideoFiles.length > 0) {
            // Clear existing queue and add new videos
            QueueManager.clearQueue();
            const success = QueueManager.addMultipleToQueue(allVideoFiles);

            if (success) {
              console.log(`Successfully added ${allVideoFiles.length} videos to queue`);
              // Start playing the first video
              playerState.playVideo(allVideoFiles[0].path);
            } else {
              console.error("Failed to add folder contents to queue");
            }

            console.log(`Found ${allVideoFiles.length} video files in all folders and subfolders`);
          } else {
            console.log("No video files found recursively in the selected folder.");
          }
        } else {
          fileBrowserState.error = "Failed to read the selected folder.";
          fileBrowserState.fileTree = null;
          fileBrowserState.currentPath = null;
          fileBrowserState.isAtRoot = false;
        }
      } else {
        console.warn("Invalid folderData received for add-folder-to-browser:", folderData);
        fileBrowserState.error = "Invalid folder data received.";
        fileBrowserState.reset();
      }
    } catch (error) {
      console.error("Failed to load file system or add folder to queue:", error);
      fileBrowserState.error = "Failed to load file system. Please try again.";
      fileBrowserState.reset();
    }
  });

  onMount(async () => {
    const res = await client.getPlatform();
    platformState.isWindows = res.isWindows;
    platformState.isMac = res.isMacOS;
    platformState.isLinux = res.isLinux;

    await import("./lib/input.svelte");
  });
</script>

<ModeWatcher />
<div class="flex h-screen flex-col">
  <div class="flex w-full flex-1 overflow-hidden">
    <PaneGroup direction="horizontal">
      <Pane defaultSize={80}>
        <main class="relative h-full">
          {#if playerState.error}
            <div
              class="absolute top-4 left-1/2 z-50 flex -translate-x-1/2 transform items-center space-x-2 rounded-lg px-4 py-2 text-white shadow-lg"
            >
              <AlertTriangle size={16} />
              <span>{playerState.error}</span>
              <button
                onclick={() => (playerState.error = null)}
                class="ml-2 rounded px-2 py-1 hover:bg-red-600"
              >
                <IconX size={16} />
              </button>
            </div>
          {/if}

          <div class="flex h-full w-full flex-col bg-zinc-950">
            <VideoPlayer />
          </div>
        </main>
      </Pane>

      {#if sidebarState.isOpen}
        <PaneResizer
          class="w-1 cursor-col-resize bg-gray-600 transition-colors hover:bg-gray-500"
        />
        <Pane defaultSize={20}>
          <aside class="h-full border-l border-gray-700">
            <Sidebar />
          </aside>
        </Pane>
      {/if}
    </PaneGroup>
  </div>
</div>
