<script lang="ts">
  import AlertTriangle from "lucide-svelte/icons/alert-triangle";
  import IconX from "lucide-svelte/icons/x";
  import { ModeWatcher } from "mode-watcher";
  import { Pane, PaneGroup, PaneResizer } from "paneforge";
  import { onMount } from "svelte";
  import Sidebar from "$components/sidebar.svelte";
  import VideoPlayer from "$components/video-player/video-player.svelte";
  import { transformDirectoryContents } from "$lib/file-browser.svelte";
  import { logger } from "$lib/logger";
  import { QueueManager } from "$lib/queue-manager";
  import { fileBrowserState } from "$lib/state/file-browser.svelte";
  import { platformState } from "$lib/state/platform.svelte";
  import { playerState } from "$lib/state/player.svelte";
  import { sidebarState } from "$lib/state/sidebar.svelte";
  import { playVideo } from "$lib/video-playback";
  import { client, handlers } from "./tipc";

  import Settings from "$components/Settings.svelte";

  QueueManager.initialize();

  async function getAllVideoFilesRecursive(
    folderPath: string,
    depth: number = 0
  ): Promise<{ duration?: number; name: string; path: string }[]> {
    let videoFiles: { duration?: number; name: string; path: string }[] = [];
    const indent = "  ".repeat(depth);
    logger.debug(`${indent}Scanning folder: ${folderPath}`);

    try {
      const contents = await client.readDirectory(folderPath);
      if (contents && contents.files) {
        console.log(`${indent}Found ${contents.files.length} items in folder`);

        for (const item of contents.files) {
          if (item.type === "video" && item.path && item.name) {
            videoFiles.push({ name: item.name, path: item.path, duration: item.duration });
            console.log(`${indent}- Found video: ${item.name}`);
          } else if (item.type === "folder" && item.path) {
            console.log(`${indent}> Entering subfolder: ${item.name}`);
            const nestedVideos = await getAllVideoFilesRecursive(item.path, depth + 1);
            console.log(`${indent}< Subfolder ${item.name} returned ${nestedVideos.length} videos`);
            videoFiles = videoFiles.concat(nestedVideos);
          }
        }
      }
    } catch (error) {
      console.error(`${indent}Error reading directory ${folderPath} recursively:`, error);
    }

    return videoFiles;
  }

  handlers.addFile.listen(async (res) => {
    logger.debug("addFile:", res);
    if (res.type === "file") {
      // Clear the queue and add the selected file
      QueueManager.clearQueue();
      QueueManager.addToQueue({
        name: res.path.split("/").pop() ?? "Video",
        path: res.path
      });
      playerState.currentIndex = 0;
      playVideo(`file://${res.path}`);
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
            files: transformDirectoryContents(dirResult)
          };
          fileBrowserState.currentPath = dirResult.currentPath;
          fileBrowserState.isAtRoot = dirResult.isAtRoot;

          const allVideoFiles = await getAllVideoFilesRecursive(result.rootPath);
          if (allVideoFiles.length > 0) {
            // Clear existing queue and add new videos
            QueueManager.clearQueue();
            const success = QueueManager.addMultipleToQueue(allVideoFiles);

            if (success) {
              console.log(`Successfully added ${allVideoFiles.length} videos to queue`);
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

<Settings />
