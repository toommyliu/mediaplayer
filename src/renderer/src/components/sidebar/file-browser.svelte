<script lang="ts">
  import { ICON_SIZE } from "@/constants";
  import { playVideo } from "@/utils/video-playback";
  import { playerState, fileBrowserState } from "@/state.svelte";
  import FileVideo from "lucide-svelte/icons/file-video";
  import Folder from "lucide-svelte/icons/folder";
  import Play from "lucide-svelte/icons/play";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import Home from "lucide-svelte/icons/home";
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import ChevronUp from "lucide-svelte/icons/chevron-up";
  import * as ContextMenu from "../ui/context-menu/index";
  import {
    openContextMenuForItem,
    closeAllContextMenus,
    loadFileSystemStructure,
    navigateToDirectory,
    navigateToParent,
    navigateToOriginalDirectory,
    toggleSort
  } from "@/utils/file-browser.svelte";
  import { type FileSystemItem } from "@/state.svelte";
  import { cn } from "@/utils/utils";
  import { makeTimeString } from "@/utils/time";
  import { copyToClipboard, showItemInFolder } from "@/utils";
  import { playlistState } from "@/state.svelte";
  import { PlaylistManager } from "@/utils/playlist";

  function isCurrentlyPlaying(item: FileSystemItem): boolean {
    if (item.type !== "video" || !playerState.currentVideo) return false;
    return playerState.currentVideo === `file://${item.path}`;
  }

  function handleItemClick(item: FileSystemItem) {
    if (item.type === "folder") {
      // Preserve current playback when navigating into folders
      navigateToDirectory(item.path);
    } else if (item.type === "video") {
      playVideo(`file://${item.path}`);
    }
  }

  function addToPlaylist(item: FileSystemItem) {
    if (item.type === "video") {
      PlaylistManager.addItemToPlaylist(playlistState.currentPlaylistId, {
        name: item.name,
        path: item.path,
        duration: item.duration,
        size: item.size
      });
    }
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

  function getDisplayPath(path: string | null): string {
    if (!path) return "";
    const parts = path.split(/[/\\]/);
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join("/")}`;
    }
    return path;
  }

  function getSortIcon(sortType: "name" | "duration") {
    if (fileBrowserState.sortBy !== sortType) return "";
    return fileBrowserState.sortDirection === "asc" ? "↑" : "↓";
  }
</script>

<div class="flex h-full flex-col space-y-2">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-medium text-zinc-300">File Browser</h3>
    <button class="text-xs text-zinc-500 hover:text-zinc-300" onclick={loadFileSystemStructure}>
      Browse
    </button>
  </div>

  {#if fileBrowserState.currentPath}
    <div class="mb-2 flex items-center gap-2 rounded bg-zinc-700/50 p-2">
      <button
        class="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
        onclick={navigateToParent}
        disabled={fileBrowserState.isAtRoot}
        title="Go back"
      >
        <ChevronLeft size={ICON_SIZE - 4} class="text-zinc-400 hover:text-zinc-200" />
      </button>
      <span class="flex-1 truncate text-xs text-zinc-400" title={fileBrowserState.currentPath}>
        {getDisplayPath(fileBrowserState.currentPath)}
      </span>
      {#if fileBrowserState.originalPath && fileBrowserState.currentPath !== fileBrowserState.originalPath}
        <button
          class="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-600"
          onclick={navigateToOriginalDirectory}
          title="Back to original directory"
        >
          <Home size={ICON_SIZE - 4} class="text-zinc-300 hover:text-zinc-100" />
        </button>
      {/if}
    </div>

    <div class="mb-2 grid grid-cols-2 gap-2 px-2 text-xs text-zinc-400">
      <button
        class={cn(
          "flex items-center justify-start hover:text-zinc-200",
          fileBrowserState.sortBy === "name" && "text-zinc-200"
        )}
        onclick={() => toggleSort("name")}
      >
        Name {getSortIcon("name")}
      </button>
      <button
        class={cn(
          "flex items-center justify-end hover:text-zinc-200",
          fileBrowserState.sortBy === "duration" && "text-zinc-200"
        )}
        onclick={() => toggleSort("duration")}
      >
        Duration {getSortIcon("duration")}
      </button>
    </div>
  {/if}

  <div class="flex-1 overflow-hidden rounded-lg bg-zinc-800">
    {#if fileBrowserState.error}
      <div class="flex h-full flex-col items-center justify-center p-3 py-8 text-center">
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
          handleItemClick(item);
        }}
        title={item.name}
      >
        {#if item.type === "folder"}
          <button class="flex min-w-0 flex-1 items-center gap-2 text-left">
            <Folder size={ICON_SIZE - 2} />
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

    {@render FileBrowserItemContextMenu(item)}
  </ContextMenu.Root>
{/snippet}

{#snippet FileBrowserItemContextMenu(item: FileSystemItem)}
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
          handleItemClick(item);
          closeAllContextMenus();
        }}
      >
        Open Folder
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
