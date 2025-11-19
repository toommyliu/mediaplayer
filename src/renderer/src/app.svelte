<script lang="ts">
  import AlertTriangle from "lucide-svelte/icons/alert-triangle";
  import IconX from "lucide-svelte/icons/x";
  import { ModeWatcher } from "mode-watcher";
  import { Pane, PaneGroup, PaneResizer } from "paneforge";
  import { onDestroy, onMount } from "svelte";
  import Sidebar from "$components/sidebar.svelte";
  import VideoPlayer from "$components/video-player/video-player.svelte";
  import Settings from "$components/Settings.svelte";
  import { logger } from "$lib/logger";
  import { QueueManager } from "$lib/queue-manager";
  import { fileBrowserState } from "$lib/state/file-browser.svelte";
  import { platformState } from "$lib/state/platform.svelte";
  import { playerState } from "$lib/state/player.svelte";
  import { sidebarState } from "$lib/state/sidebar.svelte";
  import { client, handlers } from "./tipc";
  import { settings } from "$lib/state/settings.svelte";

  QueueManager.initialize();

  handlers.addFile.listen(async (res) => {
    logger.debug("addFile:", res);
    if (res.type === "file") {
      // Clear the queue and add the selected file
      QueueManager.clear();
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
        console.log("No resucleard from loadFileBrowser");
        return;
      }

      if (result.type === "file") {
        console.log("Adding single file to queue:", result.path);

        QueueManager.clear();
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

          const allVideoFiles = await client.getAllVideoFiles(result.rootPath);
          if (allVideoFiles.length > 0) {
            // Clear existing queue and add new videos
            QueueManager.clear();
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

  handlers.openSettings.listen(() => {
    settings.showDialog = true;
  });

  onDestroy(() => {
    fileBrowserState.reset();
    QueueManager.clear();
  });

  function handlePaneGroupLayoutChange(sizes: number[]) {
    if (sizes.length > 1 && sidebarState.isOpen) {
      const sidebarSize = sizes[sizes.length - 1];
      sidebarState.width = sidebarSize;
    }
  }
</script>

<ModeWatcher />
<div class="bg-background flex h-screen flex-col overflow-hidden">
  <div class="flex w-full flex-1 overflow-hidden">
    <PaneGroup direction="horizontal" onLayoutChange={handlePaneGroupLayoutChange}>
      {#if sidebarState.isOpen}
        <Pane defaultSize={sidebarState.width} minSize={10} maxSize={40} class="z-20">
          <aside class="glass h-full w-full">
            <Sidebar />
          </aside>
        </Pane>

        <PaneResizer
          class="bg-sidebar-border hover:bg-primary/50 z-30 -ml-[1px] w-px transition-colors"
        />
      {/if}

      <Pane defaultSize={100 - sidebarState.width} minSize={22}>
        <main class="bg-background relative h-full w-full">
          {#if playerState.error}
            <div
              class="bg-destructive text-destructive-foreground absolute top-4 left-1/2 z-50 flex -translate-x-1/2 transform items-center space-x-2 rounded-lg px-4 py-2 shadow-lg"
            >
              <AlertTriangle size={16} />
              <span>{playerState.error}</span>
              <button
                onclick={() => (playerState.error = null)}
                class="ml-2 rounded px-2 py-1 transition-colors hover:bg-black/20"
              >
                <IconX size={16} />
              </button>
            </div>
          {/if}

          <div class="flex h-full w-full flex-col">
            <VideoPlayer />
          </div>
        </main>
      </Pane>
    </PaneGroup>
  </div>
</div>

<Settings />
