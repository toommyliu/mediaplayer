<script lang="ts">
  import * as ContextMenu from "$ui/context-menu/";
  import FileBrowserItem from "./FileBrowserItem.svelte";

  import { fileBrowserState } from "$lib/state/file-browser.svelte";
  import { platformState } from "$lib/state/platform.svelte";
  import { playerState } from "$lib/state/player.svelte";

  import { QueueManager } from "$lib/queue-manager";
  import { showItemInFolder } from "$/lib/showItemInFolder";
  import { playVideo } from "$/lib/video-playback";
  import { cn } from "$lib/utils";

  import { client } from "$/tipc";

  import {
    navigateToDirectory,
    transformDirectoryContents,
    type FileSystemItem
  } from "$/lib/file-browser.svelte";
  import { sortFileTree, type SortOptions } from "$shared/file-tree-utils";

  function renderFileSystemItem(item: FileSystemItem, depth = 0) {
    const isFolder = Boolean(item.files);
    const isVideo = !isFolder && item.duration !== undefined;
    const isExpanded = item.path ? fileBrowserState.expandedFolders.has(item.path) : false;
    const isCurrentlyPlaying =
      isVideo && item.path && playerState.currentVideo === `file://${item.path}`;
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
      isLoading,
      depth
    };
  }

  function handleItemClick(ev: MouseEvent, item: FileSystemItem) {
    if (!item.path || fileBrowserState.isLoading) return;

    if (item.type === "folder") {
      // mod + click to navigate to folder
      const isModKeyPressed = platformState.isMac ? ev.metaKey : ev.ctrlKey;
      if (isModKeyPressed) {
        ev.preventDefault();
        console.log("Cmd/Ctrl + click detected, navigating to:", item.path);
        void navigateToDirectory(item.path);
        return;
      }

      // Regular click to toggle folder expansion
      toggleFolder(item.path);
      fileBrowserState.fileTree = { ...fileBrowserState.fileTree! };
    } else if (item.duration !== undefined) {
      playVideo(item.path);
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
        const folderContents = transformDirectoryContents(result);
        updateFolderContents(fileBrowserState.fileSystem, folderPath, folderContents);
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
  ): boolean {
    for (let idx = 0; idx < items.length; idx++) {
      if (items[idx].path === targetPath && items[idx].files !== undefined) {
        items[idx] = { ...items[idx], files: newContents };
        fileBrowserState.fileTree = { ...fileBrowserState.fileTree! };
        return true;
      }

      if (items[idx].files && updateFolderContents(items[idx].files!, targetPath, newContents)) {
        return true;
      }
    }

    return false;
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
      onclick={(ev) => handleItemClick(ev, item)}
    >
      <div
        class={cn(
          "flex min-h-[28px] w-full items-center rounded-md",
          fileItemView.isCurrentlyPlaying
            ? "border-blue-500/30 bg-blue-500/20 hover:bg-blue-500/25"
            : "hover:bg-zinc-800/40"
        )}
        style={`padding-left: ${depth * 8 + 8}px;`}
      >
        <div class="mr-2 w-4 flex-shrink-0"></div>

        <div class="flex min-h-[28px] min-w-0 flex-1 items-center" title={item.name!}>
          <span
            class={cn(
              "flex-1 truncate text-sm font-medium",
              fileItemView.isCurrentlyPlaying &&
                "font-semibold text-blue-200 group-hover:text-blue-100",
              fileItemView.isVideo &&
                !fileItemView.isCurrentlyPlaying &&
                "text-emerald-200 group-hover:text-emerald-100",
              !fileItemView.isVideo && "text-zinc-300 group-hover:text-zinc-100"
            )}
          >
            {item!.name}
            {#if item!.type === "folder"}
              /
            {/if}
          </span>

          {#if fileItemView.isVideo}
            <span
              class={cn(
                "mt-1 mr-1 mb-1 ml-1 flex-shrink-0 rounded px-1.5 py-0.5 align-middle font-mono text-xs ring-1",
                fileItemView.isCurrentlyPlaying
                  ? "bg-blue-900/30 text-blue-200 ring-blue-700/30"
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
        </div>
      </div>
    </ContextMenu.Trigger>

    <ContextMenu.Content class="w-48 border-zinc-700 bg-zinc-800">
      {#if fileItemView.isFolder}
        <ContextMenu.Item
          class="text-zinc-200 hover:bg-zinc-700 focus:bg-zinc-700"
          onclick={(ev: MouseEvent) => handleItemClick(ev, item)}
        >
          Open Folder
        </ContextMenu.Item>
        <ContextMenu.Item
          class="text-zinc-200 hover:bg-zinc-700 focus:bg-zinc-700"
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
          class="text-zinc-200 hover:bg-zinc-700 focus:bg-zinc-700"
          onclick={(ev: MouseEvent) => handleItemClick(ev, item)}
        >
          Play
        </ContextMenu.Item>
        <ContextMenu.Item
          class="text-zinc-200 hover:bg-zinc-700 focus:bg-zinc-700"
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
        <ContextMenu.Separator class="bg-zinc-700" />
        <ContextMenu.Item
          class="text-zinc-200 hover:bg-zinc-700 focus:bg-zinc-700"
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
