<script lang="ts">
  import { logger } from "@/utils/logger";
  import AlertTriangle from "lucide-svelte/icons/alert-triangle";
  import X from "lucide-svelte/icons/x";
  import { Pane, PaneGroup, PaneResizer } from "paneforge";
  import { onMount } from "svelte";
  import Sidebar from "./components/sidebar.svelte";
  import VideoPlayer from "./components/video-player/video-player.svelte";
  import {
    fileBrowserState,
    platformState,
    playerState,
    playlistState,
    sidebarState
  } from "./state.svelte";
  import { client, handlers } from "./tipc";
  import { transformDirectoryContents } from "./utils/file-browser.svelte";
  import { PlaylistManager } from "./utils/playlist";
  import { playVideo } from "./utils/video-playback";

  PlaylistManager.initializeFromStorage();

  async function getAllVideoFilesRecursive(
    folderPath: string,
    depth: number = 0
  ): Promise<Array<{ name: string; path: string; duration?: number }>> {
    let videoFiles: Array<{ name: string; path: string; duration?: number }> = [];
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

  handlers.addFile.listen(async (path) => {
    logger.debug("addFile:", path);
    playVideo(`file://${path}`);
  });

  handlers.addFolder.listen(async (folderData) => {
    try {
      fileBrowserState.error = null;
      const result = folderData;
      console.log("loadFileBrowser result:", result);

      if (!result) return;

      if (result.type === "folder") {
        fileBrowserState.originalPath = result.rootPath;

        playerState.currentTime = 0;
        playerState.duration = 0;
        playerState.isPlaying = false;
        playerState.currentIndex = 0;
        playerState.queue = [];
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
            playerState.queue = allVideoFiles.map((vf) => `file://${vf.path}`);
            playerState.currentIndex = 0;

            console.log(`Adding ${allVideoFiles.length} videos to playlist`);
            const success = PlaylistManager.addFolderContentsToCurrentPlaylist(allVideoFiles);
            if (success) {
              console.log("Successfully added folder contents to playlist");
            } else {
              console.error("Failed to add folder contents to playlist");
            }

            console.log(
              `Playlist state before adding videos: ${playlistState.currentPlaylistId}, Items: ${playlistState.currentPlaylistItems.length}`
            );
            console.log(`Found ${allVideoFiles.length} video files in all folders and subfolders`);

            PlaylistManager.addFolderContentsToCurrentPlaylist(allVideoFiles);
            // PlaylistManager.saveCurrentState();

            console.log(
              `Playlist state after adding videos: ${playlistState.currentPlaylistId}, Items: ${playlistState.currentPlaylistItems.length}`
            );

            console.log(
              `Added ${allVideoFiles.length} videos recursively to current playlist (unsaved)`
            );
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
        fileBrowserState.fileTree = null;
        fileBrowserState.currentPath = null;
        fileBrowserState.isAtRoot = false;
        fileBrowserState.originalPath = null;
      }
    } catch (err) {
      console.error("Failed to load file system or add folder to playlist:", err);
      fileBrowserState.error = "Failed to load file system. Please try again.";
      fileBrowserState.fileTree = null;
      fileBrowserState.currentPath = null;
      fileBrowserState.isAtRoot = false;
      fileBrowserState.originalPath = null;
    }
  });

  onMount(async () => {
    const res = await client.getPlatform();
    platformState.isWindows = res.isWindows;
    platformState.isMac = res.isMacOS;
    platformState.isLinux = res.isLinux;

    PlaylistManager.initializeFromStorage();

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
              class="absolute top-4 left-1/2 z-50 flex -translate-x-1/2 transform items-center space-x-2 rounded-lg px-4 py-2 text-white shadow-lg"
            >
              <AlertTriangle size={16} />
              <span>{playerState.error}</span>
              <button
                onclick={() => (playerState.error = null)}
                class="ml-2 rounded px-2 py-1 hover:bg-red-600"
              >
                <X size={16} />
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
