<script lang="ts">
  import * as ContextMenu from "$ui/context-menu/";
  import FileBrowserItem from "./FileBrowserItem.svelte";
  import Loader2 from "~icons/lucide/loader-2";
  import LucideCircle from "~icons/lucide/circle";
  import FileIcon from "~icons/lucide/file";
  import FolderIcon from "~icons/lucide/folder";

  import { fileBrowserState, type FileSystemItem } from "$lib/state/file-browser.svelte";
  import { platformState } from "$lib/state/platform.svelte";
  import { sidebarState } from "$lib/state/sidebar.svelte";
  import { settings, type FileBrowserCompactness } from "$lib/state/settings.svelte";
  import { playerState } from "$lib/state/player.svelte";

  import { QueueManager } from "$lib/queue-manager";
  import { showItemInFolder } from "$/lib/showItemInFolder";
  import { cn } from "$lib/utils";

  import { client } from "$/tipc";
  import { makeTimeString } from "$lib/makeTimeString";

  import { sortFileTree, type SortOptions } from "$shared/index";

  function isCurrentVideo(itemPath: string | undefined): boolean {
    if (!itemPath || !playerState.currentVideo) return false;

    const currentVideoPath = playerState.currentVideo.startsWith("file://")
      ? playerState.currentVideo.slice(7)
      : playerState.currentVideo;

    return itemPath === currentVideoPath.replace(/\\/g, "/");
  }

  /**
   * Check if a collapsed folder contains the currently playing video
   */
  function hasCurrentVideoInFolder(folderItem: FileSystemItem): boolean {
    if (!folderItem.path || !playerState.currentVideo) return false;

    const currentVideoPath = playerState.currentVideo.startsWith("file://")
      ? playerState.currentVideo.slice(7)
      : playerState.currentVideo;

    return currentVideoPath.startsWith(folderItem.path + "/");
  }

  function renderFileSystemItem(item: FileSystemItem, depth = 0) {
    const isFolder = Boolean(item.files);
    const isVideo = !isFolder && item.duration !== undefined;
    const isExpanded = item.path ? fileBrowserState.expandedFolders.has(item.path) : false;
    const isCurrentlyPlaying = isVideo && isCurrentVideo(item.path);
    const hasCurrentVideoInCollapsedFolder =
      isFolder && !isExpanded && hasCurrentVideoInFolder(item);
    const isLoading = item.path ? fileBrowserState.loadingFolders.has(item.path) : false;

    const sortOptions: SortOptions = {
      sortBy: fileBrowserState.sortBy,
      sortDirection: fileBrowserState.sortDirection
    };
    const sortedChildren = item.files ? sortFileTree(item.files, sortOptions) : undefined;

    return {
      item: { ...item, files: sortedChildren },
      isFolder,
      isVideo,
      isExpanded,
      isCurrentlyPlaying,
      hasCurrentVideoInCollapsedFolder,
      isLoading,
      depth
    };
  }

  function handleItemClick(ev: MouseEvent | KeyboardEvent | Event, item: FileSystemItem) {
    if (!item.path || fileBrowserState.isLoading) return;

    if (item.type === "folder") {
      // mod + click to navigate to folder
      let isModKeyPressed = false;
      if (ev instanceof MouseEvent) {
        isModKeyPressed = platformState.isMac ? ev.metaKey : ev.ctrlKey;
      }
      if (isModKeyPressed) {
        ev.preventDefault();
        console.log("Cmd/Ctrl + click detected, navigating to:", item.path);
        void fileBrowserState.navigateToDirectory(item.path);
        return;
      }

      // Regular click to toggle folder expansion
      toggleFolder(item.path);
    } else if (item.type === "video" && item.duration !== undefined) {
      if (playerState.currentVideo) {
        const currentVideoPath = playerState.currentVideo.startsWith("file://")
          ? playerState.currentVideo.slice(7)
          : playerState.currentVideo;

        if (currentVideoPath === item.path) {
          // If the clicked video is already playing, do nothing
          return;
        }
      }

      playerState.playVideo(item.path);
    }
  }

  function toggleFolder(path: string | undefined) {
    if (!path) return;

    if (fileBrowserState.expandedFolders.has(path)) {
      fileBrowserState.expandedFolders.delete(path);
    } else {
      fileBrowserState.expandedFolders.add(path);
      void loadFolderContents(path);
    }

    fileBrowserState.expandedFolders = new Set(fileBrowserState.expandedFolders);
  }

  async function loadFolderContents(folderPath: string) {
    try {
      const folder = findFolderInFileSystem(fileBrowserState.fileSystem, folderPath);
      if (!folder) return;

      if (folder.files && folder.files.length > 0) return;

      fileBrowserState.loadingFolders.add(folderPath);
      fileBrowserState.loadingFolders = new Set(fileBrowserState.loadingFolders);

      const result = await client.readDirectory(folderPath);
      if (result?.files) {
        const folderContents = fileBrowserState.transformDirectoryContents(result);
        const updated = updateFolderContents(
          fileBrowserState.fileSystem,
          folderPath,
          folderContents
        );
        if (updated !== null) {
          fileBrowserState.fileTree = { ...fileBrowserState.fileTree!, files: updated };
        }
      }
    } catch (error) {
      console.error("Failed to load folder contents:", error);
      fileBrowserState.expandedFolders.delete(folderPath);
    } finally {
      fileBrowserState.loadingFolders.delete(folderPath);
      fileBrowserState.loadingFolders = new Set(fileBrowserState.loadingFolders);
    }
  }

  function findFolderInFileSystem(
    items: FileSystemItem[],
    targetPath: string
  ): FileSystemItem | null {
    for (const item of items) {
      if (item.path === targetPath && item.files !== undefined) {
        return item;
      }

      if (item.files) {
        const found = findFolderInFileSystem(item.files, targetPath);
        if (found) return found;
      }
    }

    return null;
  }

  function updateFolderContents(
    items: FileSystemItem[],
    targetPath: string,
    newContents: FileSystemItem[]
  ): FileSystemItem[] | null {
    for (let idx = 0; idx < items.length; idx++) {
      if (items[idx].path === targetPath && items[idx].files !== undefined) {
        const newItems = [...items];
        newItems[idx] = { ...items[idx], files: newContents };
        return newItems;
      }

      if (items[idx].files) {
        const updatedSub = updateFolderContents(items[idx].files!, targetPath, newContents);
        if (updatedSub !== null) {
          const newItems = [...items];
          newItems[idx] = { ...items[idx], files: updatedSub };
          return newItems;
        }
      }
    }

    return null;
  }

  let { depth, item }: Props = $props();

  type Props = {
    depth: number;
    item: FileSystemItem;
  };

  const fileItemView = $derived(renderFileSystemItem(item, depth));
  const displayDuration = item.duration ?? 0;

  const isCompact = $derived(() => {
    const mode: FileBrowserCompactness = settings.fileBrowserCompactness;
    if (mode === "compact" || mode === "mini") return true;
    if (mode === "comfortable") return false;
    return sidebarState.width <= 16; // auto
  });
  const isMini = $derived(() => {
    const mode: FileBrowserCompactness = settings.fileBrowserCompactness;
    if (mode === "mini") return true;
    if (mode === "compact") return false;
    if (mode === "comfortable") return false;
    return sidebarState.width <= 11; // auto
  });
</script>

{#key fileItemView.item.path}
  <ContextMenu.Root
    open={fileBrowserState.openContextMenu === item.path}
    onOpenChange={(open) => {
      if (open) {
        fileBrowserState.openContextMenu = item.path;
      } else if (fileBrowserState.openContextMenu === item.path) {
        fileBrowserState.openContextMenu = null;
      }
    }}
  >
    <ContextMenu.Trigger
      class={cn(
        "group relative z-10 flex min-h-[28px] items-center transition-all duration-200",
        fileBrowserState.isLoading && "cursor-not-allowed opacity-50"
      )}
      title={isMini()
        ? `${item.name} ${displayDuration > 0 ? "— " + makeTimeString(displayDuration) : ""}`
        : undefined}
      aria-label={isMini()
        ? `${item.name} ${displayDuration > 0 ? "— " + makeTimeString(displayDuration) : ""}`
        : undefined}
    >
      <div
        class={cn(
          "flex min-h-[28px] w-full items-center rounded-md border transition-all duration-200",
          fileItemView.isCurrentlyPlaying
            ? "border-primary/30 bg-primary/10 hover:border-primary/40 hover:bg-primary/20"
            : "hover:border-input/30 hover:bg-muted/40 border-transparent"
        )}
        style={`padding-left: ${isMini() ? 8 : depth * 12 + 8}px;`}
        data-item-trigger="true"
        data-path={item.path}
        tabindex={0}
        role="option"
        aria-selected={fileBrowserState.focusedItemPath === item.path}
        onfocus={() => (fileBrowserState.focusedItemPath = item.path)}
        onclick={(ev) => handleItemClick(ev, item)}
        onkeydown={(ev: KeyboardEvent) => {
          const triggers = Array.from(
            document.querySelectorAll('[data-item-trigger="true"]')
          ) as HTMLElement[];
          const currentIndex = triggers.findIndex((t) => t.dataset.path === item.path);

          if (document.activeElement !== ev.currentTarget) return;

          if (ev.key === "ArrowDown") {
            ev.preventDefault();
            const next = triggers[currentIndex + 1];
            if (next) next.focus();
          } else if (ev.key === "ArrowUp") {
            ev.preventDefault();
            const prev = triggers[currentIndex - 1];
            if (prev) prev.focus();
          } else if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            handleItemClick(ev, item);
          } else if (ev.key === "ArrowRight") {
            // Expand folder if present
            if (item.type === "folder" && !fileBrowserState.expandedFolders.has(item.path!)) {
              ev.preventDefault();
              toggleFolder(item.path);
            }
          } else if (ev.key === "ArrowLeft") {
            // Collapse folder
            if (item.type === "folder" && fileBrowserState.expandedFolders.has(item.path!)) {
              ev.preventDefault();
              toggleFolder(item.path);
            }
          }
        }}
      >
        <div class="mr-2 w-4 flex-shrink-0"></div>

        <div class="flex min-h-[28px] min-w-0 flex-1 items-center">
          {#if isMini()}
            <div class="flex items-center gap-2">
              {#if fileItemView.isFolder}
                <FolderIcon class="h-4 w-4 opacity-80" />
              {:else}
                <FileIcon class="h-4 w-4 opacity-80" />
              {/if}
              <span class="sr-only">{item!.name}</span>
            </div>
          {:else}
            <span
              class={cn(
                "flex flex-1 items-center truncate font-medium transition-colors duration-200",
                isCompact() ? "text-xs" : "text-sm",
                fileItemView.isCurrentlyPlaying &&
                  "text-primary group-hover:text-primary/80 font-semibold",
                fileItemView.isVideo &&
                  !fileItemView.isCurrentlyPlaying &&
                  "text-sidebar-foreground group-hover:text-sidebar-foreground/80",
                !fileItemView.isVideo &&
                  "text-sidebar-foreground group-hover:text-sidebar-foreground/80"
              )}
            >
              {item!.name}
              {#if item!.type === "folder"}
                /
              {/if}
            </span>
          {/if}

          {#if fileItemView.isLoading}
            <Loader2
              class={cn("h-4 w-4 animate-spin text-blue-400", isCompact() ? "ml-1" : "ml-2")}
            />
          {/if}

          {#if fileItemView.isVideo && !isCompact() && !isMini()}
            <span
              class={cn(
                "mt-1 mr-1 mb-1 ml-1 flex-shrink-0 rounded px-1.5 py-0.5 align-middle font-mono text-xs ring-1 transition-all duration-200",
                fileItemView.isCurrentlyPlaying
                  ? "bg-primary/10 text-primary ring-primary/30"
                  : "bg-sidebar-accent text-muted-foreground ring-sidebar-border"
              )}
            >
              {#if displayDuration > 0}
                {Math.floor(displayDuration / 60)}:{Math.floor(displayDuration % 60)
                  .toString()
                  .padStart(2, "0")}
              {:else}
                --:--
              {/if}
            </span>
          {/if}

          {#if fileItemView.hasCurrentVideoInCollapsedFolder}
            <LucideCircle
              class={cn("fill-primary text-primary h-2 w-2", isCompact() ? "mr-1" : "mr-2")}
            />
          {/if}
        </div>
      </div>
    </ContextMenu.Trigger>

    <ContextMenu.Content class="border-input bg-popover w-48">
      {#if fileItemView.isFolder}
        <ContextMenu.Item
          class="text-muted-foreground hover:bg-popover/70 focus:bg-popover/70"
          onclick={(ev: MouseEvent) => {
            console.log("click folder");
            handleItemClick(ev, item);
          }}
        >
          Open Folder
        </ContextMenu.Item>
        <ContextMenu.Item
          class="text-muted-foreground hover:bg-popover/70 focus:bg-popover/70"
          onclick={() => {
            if (item.path) {
              showItemInFolder(item.path);
            }
          }}
        >
          Show in Finder
        </ContextMenu.Item>
      {:else}
        <ContextMenu.Item
          class="text-muted-foreground hover:bg-popover/70 focus:bg-popover/70"
          onclick={(ev: MouseEvent) => handleItemClick(ev, item)}
        >
          Play
        </ContextMenu.Item>
        <ContextMenu.Item
          class="text-muted-foreground hover:bg-popover/70 focus:bg-popover/70"
          onclick={() => {
            console.log("Adding to queue:", item);
            if (item.path && item.name) {
              QueueManager.addToQueue({
                name: item.name,
                path: item.path,
                duration: item.duration
              });
            }
          }}
        >
          Add to Queue
        </ContextMenu.Item>
        <ContextMenu.Item
          class="text-muted-foreground hover:bg-popover/70 focus:bg-popover/70"
          onclick={() => {
            // Insert this file to play next after the current item
            if (item.path && item.name) {
              QueueManager.addNextToQueue({
                name: item.name,
                path: item.path,
                duration: item.duration
              });
            }
          }}
        >
          Play Next
        </ContextMenu.Item>
        <ContextMenu.Separator class="bg-border" />
        <ContextMenu.Item
          class="text-muted-foreground hover:bg-popover/70 focus:bg-popover/70"
          onclick={() => {
            if (item.path) {
              showItemInFolder(item.path);
            }
          }}
        >
          Show in Finder
        </ContextMenu.Item>
      {/if}
    </ContextMenu.Content>
  </ContextMenu.Root>

  {#if fileItemView.isFolder && fileItemView.isExpanded && fileItemView.item.files}
    {#each fileItemView.item.files as subItem (`${subItem.path}-${subItem.name}`)}
      <FileBrowserItem item={subItem} depth={fileItemView.depth + 1} />
    {/each}
  {/if}
{/key}
