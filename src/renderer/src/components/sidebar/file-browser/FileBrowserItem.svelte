<script lang="ts">
  import * as ContextMenu from "$ui/context-menu/";
  import FileBrowserItem from "./FileBrowserItem.svelte";
  import Loader2 from "~icons/lucide/loader-2";
  import LucideCircle from "~icons/lucide/circle";

  import { fileBrowserState, type FileSystemItem } from "$lib/state/file-browser.svelte";
  import { platformState } from "$lib/state/platform.svelte";
  import { playerState } from "$lib/state/player.svelte";

  import { QueueManager } from "$lib/queue-manager";
  import { showItemInFolder } from "$/lib/showItemInFolder";
  import { cn } from "$lib/utils";

  import { client } from "$/tipc";

  import { sortFileTree, type SortOptions } from "$shared/index";

  function isCurrentVideo(itemPath: string | undefined): boolean {
    if (!itemPath || !playerState.currentVideo) return false;

    const currentVideoPath = playerState.currentVideo.startsWith("file://")
      ? playerState.currentVideo.slice(7)
      : playerState.currentVideo;

    return itemPath === currentVideoPath;
  }

  /**
   * Check if a collapsed folder contains the currently playing video
   */
  function hasCurrentVideoInFolder(folderItem: FileSystemItem): boolean {
    if (!folderItem.files || !playerState.currentVideo) return false;

    const currentVideoPath = playerState.currentVideo.startsWith("file://")
      ? playerState.currentVideo.slice(7)
      : playerState.currentVideo;

    return searchForCurrentVideoInFiles(folderItem.files, currentVideoPath);
  }

  function searchForCurrentVideoInFiles(files: FileSystemItem[], targetPath: string): boolean {
    for (const file of files) {
      if (file.path === targetPath) return true;
      if (file.files && searchForCurrentVideoInFiles(file.files, targetPath)) return true;
    }
    return false;
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
    } else if (item.duration !== undefined) {
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
        const updated = updateFolderContents(fileBrowserState.fileSystem, folderPath, folderContents);
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
    >
      <div
        class={cn(
          "flex min-h-[28px] w-full items-center rounded-md border transition-all duration-200",
          fileItemView.isCurrentlyPlaying
            ? "border-blue-500/30 bg-blue-500/15 hover:border-blue-500/40 hover:bg-blue-500/20"
            : "border-transparent hover:border-input/30 hover:bg-muted/40"
        )}
        style={`padding-left: ${depth * 12 + 8}px;`}
        data-item-trigger="true"
        data-path={item.path}
        tabindex={0}
        role="option"
        aria-selected={fileBrowserState.focusedItemPath === item.path}
        onfocus={() => (fileBrowserState.focusedItemPath = item.path)}
        onclick={(ev) => handleItemClick(ev, item)}
        onkeydown={(ev) => {
          const e = ev as KeyboardEvent;
          // Navigation support: up/down arrows move between file items, Enter/Space activates
          const triggers = Array.from(document.querySelectorAll('[data-item-trigger="true"]')) as HTMLElement[];
          const currentIndex = triggers.findIndex((t) => t.dataset.path === item.path);
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = triggers[currentIndex + 1];
            if (next) next.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = triggers[currentIndex - 1];
            if (prev) prev.focus();
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleItemClick(ev, item);
          } else if (e.key === 'ArrowRight') {
            // Expand folder if present
            if (item.type === 'folder' && !fileBrowserState.expandedFolders.has(item.path!)) {
              e.preventDefault();
              toggleFolder(item.path);
            }
          } else if (e.key === 'ArrowLeft') {
            // Collapse folder
            if (item.type === 'folder' && fileBrowserState.expandedFolders.has(item.path!)) {
              e.preventDefault();
              toggleFolder(item.path);
            }
          }
        }}
      >
        <div class="mr-2 w-4 flex-shrink-0"></div>

        <div class="flex min-h-[28px] min-w-0 flex-1 items-center">
          <span
            class={cn(
              "flex items-center flex-1 truncate text-sm font-medium transition-colors duration-200",
              fileItemView.isCurrentlyPlaying &&
                "font-semibold text-blue-200 group-hover:text-blue-100",
              fileItemView.isVideo &&
                !fileItemView.isCurrentlyPlaying &&
                "text-emerald-200 group-hover:text-emerald-100",
                !fileItemView.isVideo && "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {item!.name}
            {#if item!.type === "folder"}
              /
            {/if}
          </span>

          {#if fileItemView.isLoading}
            <Loader2 class="h-4 w-4 animate-spin ml-2 text-blue-400" />
          {/if}

          {#if fileItemView.isVideo}
            <span
              class={cn(
                "mt-1 mr-1 mb-1 ml-1 flex-shrink-0 rounded px-1.5 py-0.5 align-middle font-mono text-xs ring-1 transition-all duration-200",
                fileItemView.isCurrentlyPlaying
                  ? "bg-blue-900/25 text-blue-200 ring-blue-600/40"
                  : "bg-emerald-900/20 text-emerald-200 ring-emerald-700/20"
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
            <LucideCircle class="mr-2 h-2 w-2 fill-blue-400 text-blue-400" />
          {/if}
        </div>
      </div>
    </ContextMenu.Trigger>

    <ContextMenu.Content class="w-48 border-input bg-popover">
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
