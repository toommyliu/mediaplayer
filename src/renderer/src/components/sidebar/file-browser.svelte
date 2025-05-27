<script lang="ts">
  import { ICON_SIZE } from "@/constants";
  import { playVideo } from "@/utils/video-playback";
  import FileVideo from "lucide-svelte/icons/file-video";
  import Folder from "lucide-svelte/icons/folder";
  import FolderOpen from "lucide-svelte/icons/folder-open";
  import * as ContextMenu from "../ui/context-menu/index";
  import {
    getFileBrowserContext,
    formatDuration,
    copyToClipboard,
    showInFinder,
    type FileSystemItem
  } from "@/utils/file-browser.svelte";

  // Get the file browser context
  const fileBrowser = getFileBrowserContext();

  function handleItemClick(item: FileSystemItem) {
    if (item.type === "folder") {
      fileBrowser.toggleFolder(item.path);
    } else if (item.type === "video") {
      playVideo(`file://${item.path}`);
    }
  }

  function addToPlaylist(item: FileSystemItem) {
    // if (item.type === "video") {
    //   PlaylistManager.addItemToPlaylist(playlistState.currentPlaylistId, {
    //     name: item.name,
    //     path: item.path,
    //     duration: item.duration,
    //     size: item.size
    //   });
    // }
    console.log("Add to playlist:", item.name);
  }

  function addFolderToPlaylist(folder: FileSystemItem) {
    if (folder.children) {
      folder.children.forEach((child) => {
        if (child.type === "video") {
          addToPlaylist(child);
        } else if (child.type === "folder") {
          addFolderToPlaylist(child);
        }
      });
    }
  }
</script>

<div class="space-y-2">
  <div class="mb-3 flex items-center justify-between">
    <h3 class="text-sm font-medium text-zinc-300">File Browser</h3>
    <button
      class="text-xs text-zinc-500 hover:text-zinc-300"
      onclick={fileBrowser.loadFileSystemStructure}
    >
      Browse
    </button>
  </div>

  <div class="h-[87vh] overflow-hidden rounded-lg bg-zinc-800 p-3">
    {#if fileBrowser.error}
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <div class="mb-2 text-lg">⚠️</div>
        <div class="text-xs text-red-400">{fileBrowser.error}</div>
        <button
          class="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
          onclick={fileBrowser.loadFileSystemStructure}
        >
          Try again
        </button>
      </div>
    {:else}
      <div class="space-y-1 overflow-hidden text-xs text-zinc-400">
        {#each fileBrowser.fileSystem as item}
          {@render FileBrowserItem(item, 0)}
        {/each}
      </div>
    {/if}
  </div>
</div>

{#snippet FileBrowserItem(item: FileSystemItem, depth: number)}
  {@const isExpanded = fileBrowser.expandedFolders.has(item.path)}
  {@const paddingLeft = depth * 16}
  {@const isContextMenuOpen = fileBrowser.openContextMenu === item.path}

  <ContextMenu.Root
    open={isContextMenuOpen}
    onOpenChange={(open) => {
      if (open) {
        fileBrowser.openContextMenuForItem(item.path);
      } else if (fileBrowser.openContextMenu === item.path) {
        fileBrowser.closeAllContextMenus();
      }
    }}
  >
    <ContextMenu.Trigger class="w-full">
      <div
        class="group flex min-w-0 cursor-pointer items-center gap-2 rounded p-2 hover:bg-zinc-700"
        style="padding-left: {paddingLeft + 8}px"
      >
        {#if item.type === "folder"}
          <button
            onclick={() => fileBrowser.toggleFolder(item.path)}
            class="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {#if isExpanded}
              <FolderOpen size={ICON_SIZE - 2} />
            {:else}
              <Folder size={ICON_SIZE - 2} />
            {/if}
            <span class="truncate">{item.name}</span>
          </button>
        {:else}
          <div class="flex min-w-0 flex-1 items-center gap-2" onclick={() => handleItemClick(item)}>
            <FileVideo size={ICON_SIZE - 2} />
            <span class="flex-1 truncate" title={item.name}>{item.name}</span>
            {#if item.duration && item.duration > 0}
              <span class="flex-shrink-0 text-xs text-blue-400"
                >{formatDuration(item.duration)}</span
              >
            {/if}
          </div>
        {/if}

        {#if item.type === "video"}
          <button
            onclick={(e) => {
              e.stopPropagation();
              addToPlaylist(item);
            }}
            class="flex-shrink-0 p-1 text-zinc-500 opacity-0 hover:text-blue-400 group-hover:opacity-100"
          >
            +
          </button>
        {/if}
      </div>
    </ContextMenu.Trigger>

    <ContextMenu.Content>
      {#if item.type === "video"}
        <ContextMenu.Item
          onclick={() => {
            handleItemClick(item);
            fileBrowser.closeAllContextMenus();
          }}
        >
          Play Video
        </ContextMenu.Item>
        <ContextMenu.Item
          onclick={() => {
            addToPlaylist(item);
            fileBrowser.closeAllContextMenus();
          }}
        >
          Add to Playlist
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item
          onclick={() => {
            copyToClipboard(item.path);
            fileBrowser.closeAllContextMenus();
          }}
        >
          Copy Path
        </ContextMenu.Item>
        <ContextMenu.Item
          onclick={() => {
            showInFinder(item.path);
            fileBrowser.closeAllContextMenus();
          }}
        >
          Show in Finder
        </ContextMenu.Item>
      {:else if item.type === "folder"}
        <ContextMenu.Item
          onclick={() => {
            fileBrowser.toggleFolder(item.path);
            fileBrowser.closeAllContextMenus();
          }}
        >
          {isExpanded ? "Collapse" : "Expand"} Folder
        </ContextMenu.Item>
        <ContextMenu.Item
          onclick={() => {
            addFolderToPlaylist(item);
            fileBrowser.closeAllContextMenus();
          }}
        >
          Add All Videos to Playlist
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item
          onclick={() => {
            copyToClipboard(item.path);
            fileBrowser.closeAllContextMenus();
          }}
        >
          Copy Path
        </ContextMenu.Item>
        <ContextMenu.Item
          onclick={() => {
            showInFinder(item.path);
            fileBrowser.closeAllContextMenus();
          }}
        >
          Show in Finder
        </ContextMenu.Item>
      {/if}
    </ContextMenu.Content>
  </ContextMenu.Root>

  {#if item.type === "folder" && isExpanded && item.children}
    {#each item.children as child}
      {@render FileBrowserItem(child, depth + 1)}
    {/each}
  {/if}
{/snippet}
