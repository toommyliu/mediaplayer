<script lang="ts">
  import { ICON_SIZE } from "@/constants";
  import { playVideo } from "@/utils/video-playback";
  import { playerState, fileBrowserState } from "@/state.svelte";
  import FileVideo from "lucide-svelte/icons/file-video";
  import Folder from "lucide-svelte/icons/folder";
  import FolderOpen from "lucide-svelte/icons/folder-open";
  import Play from "lucide-svelte/icons/play";
  import * as ContextMenu from "../ui/context-menu/index";
  import {
    toggleFolder,
    openContextMenuForItem,
    closeAllContextMenus,
    loadFileSystemStructure
  } from "@/utils/file-browser.svelte";
  import { type FileSystemItem } from "@/state.svelte";
  import { cn } from "@/utils/utils";
  import { makeTimeString } from "@/utils/time";
  import { copyToClipboard, showItemInFolder } from "@/utils";

  function isCurrentlyPlaying(item: FileSystemItem): boolean {
    if (item.type !== "video" || !playerState.currentVideo) return false;
    return playerState.currentVideo === `file://${item.path}`;
  }

  function handleItemClick(item: FileSystemItem) {
    if (item.type === "folder") {
      toggleFolder(item.path);
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
    <button class="text-xs text-zinc-500 hover:text-zinc-300" onclick={loadFileSystemStructure}>
      Browse
    </button>
  </div>

  <div class="h-[87vh] overflow-hidden rounded-lg bg-zinc-800">
    {#if fileBrowserState.error}
      <div class="flex flex-col items-center justify-center p-3 py-8 text-center">
        <div class="mb-2 text-lg">⚠️</div>
        <div class="text-xs text-red-400">{fileBrowserState.error}</div>
        <button
          class="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
          onclick={loadFileSystemStructure}
        >
          Try again
        </button>
      </div>
    {:else}
      <div class="no-scrollbar h-full overflow-y-auto bg-zinc-800 p-3">
        <div class="space-y-1 text-xs text-zinc-400">
          {#each fileBrowserState.fileSystem as item}
            {@render FileBrowserItem(item, 0)}
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

{#snippet FileBrowserItem(item: FileSystemItem, depth: number)}
  {@const isExpanded = fileBrowserState.expandedFolders.has(item.path)}
  {@const paddingLeft = depth * 16}
  {@const isContextMenuOpen = fileBrowserState.openContextMenu === item.path}

  <ContextMenu.Root
    open={isContextMenuOpen}
    onOpenChange={(open) => {
      if (open) {
        openContextMenuForItem(item.path);
      } else if (fileBrowserState.openContextMenu === item.path) {
        closeAllContextMenus();
      }
    }}
  >
    <ContextMenu.Trigger class="w-full">
      <div
        class={cn(
          "group flex min-w-0 cursor-pointer items-center gap-2 rounded p-2 transition-colors",
          item.type === "video" &&
            isCurrentlyPlaying(item) && [
              "bg-blue-500/20",
              "border border-blue-400",
              "hover:bg-blue-500/30"
            ],
          !(item.type === "video" && isCurrentlyPlaying(item)) && "hover:bg-zinc-700"
        )}
        style="padding-left: {paddingLeft + 8}px"
        ondblclick={(ev) => {
          ev.stopPropagation();
          if (item.type === "video") {
            handleItemClick(item);
          } else if (item.type === "folder") {
            toggleFolder(item.path);
          }
        }}
        title={item.name}
      >
        {#if item.type === "folder"}
          <button class="flex min-w-0 flex-1 items-center gap-2 text-left">
            {#if isExpanded}
              <FolderOpen size={ICON_SIZE - 2} />
            {:else}
              <Folder size={ICON_SIZE - 2} />
            {/if}
            <span class="truncate">{item.name}</span>
          </button>
        {:else}
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <div class="relative">
              <FileVideo
                size={ICON_SIZE - 2}
                class={cn(isCurrentlyPlaying(item) && "text-blue-400")}
              />
              {#if isCurrentlyPlaying(item)}
                <Play
                  size={8}
                  class="absolute -bottom-1 -right-1 rounded-full bg-zinc-800 p-0.5 text-blue-400"
                />
              {/if}
            </div>
            <span
              class={cn(
                "flex-1 truncate",
                isCurrentlyPlaying(item) && ["text-blue-400", "font-medium"]
              )}
              title={item.name}
            >
              {item.name}
            </span>
            {#if item.duration && item.duration > 0}
              <span class="flex-shrink-0 text-xs text-blue-400"
                >{makeTimeString(item.duration)}</span
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

    {@render FileBrowserItemContextMenu(item, isExpanded)}
  </ContextMenu.Root>

  {#if item.type === "folder" && isExpanded && item.children}
    {#each item.children as child}
      {@render FileBrowserItem(child, depth + 1)}
    {/each}
  {/if}
{/snippet}

{#snippet FileBrowserItemContextMenu(item: FileSystemItem, isExpanded: boolean)}
  <ContextMenu.Content>
    {#if item.type === "video"}
      <ContextMenu.Item
        onclick={() => {
          handleItemClick(item);
          closeAllContextMenus();
        }}
      >
        Play Video
      </ContextMenu.Item>
      <ContextMenu.Item
        onclick={() => {
          addToPlaylist(item);
          closeAllContextMenus();
        }}
      >
        Add to Playlist
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item
        onclick={() => {
          copyToClipboard(item.path);
          closeAllContextMenus();
        }}
      >
        Copy Path
      </ContextMenu.Item>
      <ContextMenu.Item
        onclick={() => {
          showItemInFolder(item.path);
          closeAllContextMenus();
        }}
      >
        Reveal
      </ContextMenu.Item>
    {:else if item.type === "folder"}
      <ContextMenu.Item
        onclick={() => {
          toggleFolder(item.path);
          closeAllContextMenus();
        }}
      >
        {isExpanded ? "Collapse" : "Expand"}
      </ContextMenu.Item>
      <ContextMenu.Item
        onclick={() => {
          addFolderToPlaylist(item);
          closeAllContextMenus();
        }}
      >
        Add All Videos to Playlist
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item
        onclick={() => {
          copyToClipboard(item.path);
          closeAllContextMenus();
        }}
      >
        Copy Path
      </ContextMenu.Item>
      <ContextMenu.Item
        onclick={() => {
          showItemInFolder(item.path);
          closeAllContextMenus();
        }}
      >
        Reveal
      </ContextMenu.Item>
    {/if}
  </ContextMenu.Content>
{/snippet}
