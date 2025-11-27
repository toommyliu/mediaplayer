<script lang="ts">
  import Settings from "$components/Settings.svelte";
  import Sidebar from "$components/sidebar.svelte";
  import VideoPlayer from "$components/video-player/video-player.svelte";
  import { logger } from "$lib/logger";
  import { QueueManager } from "$lib/queue-manager";
  import { fileBrowserState } from "$lib/state/file-browser.svelte";
  import { platformState } from "$lib/state/platform.svelte";
  import { playerState } from "$lib/state/player.svelte";
  import { settings } from "$lib/state/settings.svelte";
  import { sidebarState } from "$lib/state/sidebar.svelte";
  import { droppable, type DragDropState } from "@thisux/sveltednd";
  import AlertTriangle from "lucide-svelte/icons/alert-triangle";
  import IconX from "lucide-svelte/icons/x";
  import { ModeWatcher } from "mode-watcher";
  import { Pane, PaneGroup, PaneResizer } from "paneforge";
  import { onDestroy, onMount } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import { client, handlers } from "./tipc";

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
      const sidebarSize = sidebarState.position === "left" ? sizes[0] : sizes[sizes.length - 1];

      const widthDiff = Math.abs(sidebarSize - sidebarState.width);
      if (
        widthDiff > 0.5 &&
        sidebarSize >= sidebarState.MIN_WIDTH &&
        sidebarSize <= sidebarState.MAX_WIDTH
      ) {
        sidebarState.width = sidebarSize;
      }
    }
  }

  // Drag and drop state
  let isDraggingSidebar = $state(false);
  let dropZoneActive = $state<"left" | "right" | null>(null);

  let isHoverOpen = $state(false);
  let closeTimeout: NodeJS.Timeout;

  function handleDrop(state: DragDropState<{ type: "sidebar" }>) {
    const { targetContainer } = state;
    if (targetContainer === "drop-left") {
      sidebarState.position = "left";
      sidebarState.isOpen = true;
    } else if (targetContainer === "drop-right") {
      sidebarState.position = "right";
      sidebarState.isOpen = true;
    }
    isDraggingSidebar = false;
    dropZoneActive = null;
  }

  function handleDragStart() {
    isDraggingSidebar = true;
    window.addEventListener("keydown", handleKeyboardShortcut);
  }

  function handleDragEnd() {
    isDraggingSidebar = false;
    dropZoneActive = null;
    window.removeEventListener("keydown", handleKeyboardShortcut);
  }

  function handleKeyboardShortcut(event: KeyboardEvent) {
    if (!isDraggingSidebar) return;

    switch (event.key) {
      case "ArrowLeft":
      case "l":
      case "L":
        event.preventDefault();
        sidebarState.position = "left";
        isDraggingSidebar = false;
        dropZoneActive = null;
        break;
      case "ArrowRight":
      case "r":
      case "R":
        event.preventDefault();
        sidebarState.position = "right";
        isDraggingSidebar = false;
        dropZoneActive = null;
        break;
      case "Escape":
        event.preventDefault();
        isDraggingSidebar = false;
        dropZoneActive = null;
        break;
    }
  }

  function handleDragEnter(zone: "left" | "right") {
    return () => {
      dropZoneActive = zone;
    };
  }

  function handleDragLeave() {
    dropZoneActive = null;
  }
</script>

<ModeWatcher />
<div class="bg-background flex h-screen flex-col overflow-hidden">
  <div class="flex w-full flex-1 overflow-hidden">
    {#key sidebarState.position}
      <PaneGroup direction="horizontal" onLayoutChange={handlePaneGroupLayoutChange}>
        {#if sidebarState.isOpen && sidebarState.position === "left" && !isDraggingSidebar}
          {@render SidebarImpl()}

          <PaneResizer
            class="bg-sidebar-border hover:bg-primary/50 z-30 -ml-[1px] w-px transition-colors"
          />
        {/if}

        <Pane defaultSize={100 - sidebarState.width} minSize={22} class="relative">
          {#if isDraggingSidebar}
            <div
              class="bg-background/50 pointer-events-none fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
            >
              <div class="drop-overlay pointer-events-auto flex flex-col gap-4">
                <div class="bg-card/95 ring-border flex gap-4 rounded-xl p-4 shadow-2xl ring-1">
                  <!-- Left drop zone -->
                  <div
                    class="drop-zone border-border bg-muted/50 hover:border-primary/50 hover:bg-primary/10 flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-all"
                    class:active={dropZoneActive === "left"}
                    use:droppable={{
                      container: "drop-left",
                      callbacks: {
                        onDrop: handleDrop,
                        onDragEnter: handleDragEnter("left"),
                        onDragLeave: handleDragLeave
                      }
                    }}
                  >
                    <div class="flex flex-col items-center gap-2">
                      <div class="text-4xl">←</div>
                      <span class="text-muted-foreground text-xs font-medium">Left</span>
                      <span class="text-muted-foreground/60 text-[10px]">← or L</span>
                    </div>
                  </div>

                  <!-- Right drop zone -->
                  <div
                    class="drop-zone border-border bg-muted/50 hover:border-primary/50 hover:bg-primary/10 flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-all"
                    class:active={dropZoneActive === "right"}
                    use:droppable={{
                      container: "drop-right",
                      callbacks: {
                        onDrop: handleDrop,
                        onDragEnter: handleDragEnter("right"),
                        onDragLeave: handleDragLeave
                      }
                    }}
                  >
                    <div class="flex flex-col items-center gap-2">
                      <div class="text-4xl">→</div>
                      <span class="text-muted-foreground text-xs font-medium">Right</span>
                      <span class="text-muted-foreground/60 text-[10px]">→ or R</span>
                    </div>
                  </div>
                </div>

                <!-- Escape hint -->
                <div class="text-muted-foreground/60 mx-auto text-center text-xs">
                  Press <kbd class="bg-muted rounded border px-1.5 py-0.5 text-[10px] font-medium"
                    >Esc</kbd
                  > to cancel
                </div>
              </div>
            </div>
          {/if}

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

        {#if sidebarState.isOpen && sidebarState.position === "right" && !isDraggingSidebar}
          <PaneResizer
            class="bg-sidebar-border hover:bg-primary/50 z-30 -mr-[1px] w-px transition-colors"
          />

          {@render SidebarImpl()}
        {/if}
      </PaneGroup>
    {/key}
  </div>
</div>

<Settings />

{#snippet SidebarImpl()}
  <Pane
    defaultSize={sidebarState.width}
    minSize={sidebarState.MIN_WIDTH}
    maxSize={sidebarState.MAX_WIDTH}
    class="z-20"
  >
    <aside class="glass relative h-full w-full">
      <Sidebar onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
    </aside>
  </Pane>
{/snippet}

<!-- the hover trigger zone -->
{#if !sidebarState.isOpen}
  <div
    role="presentation"
    class="fixed top-0 bottom-0 z-40 w-4 transition-colors"
    class:left-0={sidebarState.position === "left"}
    class:right-0={sidebarState.position === "right"}
    onmouseenter={() => {
      clearTimeout(closeTimeout);
      isHoverOpen = true;
    }}
  ></div>
{/if}

{#if !sidebarState.isOpen && isHoverOpen && !isDraggingSidebar}
  <div
    role="presentation"
    class="bg-background/95 border-sidebar-border fixed top-4 bottom-4 z-50 w-[300px] overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md"
    class:left-4={sidebarState.position === "left"}
    class:right-4={sidebarState.position === "right"}
    transition:fly={{
      x: sidebarState.position === "left" ? -20 : 20,
      duration: 200,
      easing: cubicOut
    }}
    onmouseenter={() => clearTimeout(closeTimeout)}
    onmouseleave={() => {
      closeTimeout = setTimeout(() => {
        isHoverOpen = false;
      }, 300);
    }}
  >
    <Sidebar onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
  </div>
{/if}
