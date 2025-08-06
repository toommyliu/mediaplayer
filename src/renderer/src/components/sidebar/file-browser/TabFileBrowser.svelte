<script lang="ts">
  import { queue } from "$/lib/state/queue.svelte";
  import { client } from "$/tipc";
  import {
    loadFileSystemStructure,
    navigateToDirectory,
    navigateToParent,
    transformDirectoryContents
  } from "$lib/file-browser.svelte";
  import { fileBrowserState, type FileSystemItem } from "$lib/state/file-browser.svelte";
  import { platformState } from "$lib/state/platform.svelte";
  import { playerState } from "$lib/state/player.svelte";
  import { cn } from "$lib/utils";
  import { playVideo } from "$lib/video-playback";
  import Button from "$ui/button/button.svelte";
  import AlertCircle from "lucide-svelte/icons/alert-circle";
  import ArrowDown01 from "lucide-svelte/icons/arrow-down-01";
  import ArrowDownAZ from "lucide-svelte/icons/arrow-down-a-z";
  import ArrowUp10 from "lucide-svelte/icons/arrow-up-10";
  import ArrowUpAZ from "lucide-svelte/icons/arrow-up-a-z";
  import FolderPlus from "lucide-svelte/icons/folder-plus";
  import ListRestart from "lucide-svelte/icons/list-restart";
  import Loader2 from "lucide-svelte/icons/loader-2";
  import { fade } from "svelte/transition";
  import { sortFileTree, type SortOptions } from "../../../../../shared";
  import FileBrowserItem from "./FileBrowserItem.svelte";
  const hasNoFiles = $derived(fileBrowserState.fileSystem.length === 0);

  const sortedFileSystem = $derived(() => {
    const sortOptions: SortOptions = {
      sortBy: fileBrowserState.sortBy,
      sortDirection: fileBrowserState.sortDirection
    };
    return sortFileTree(fileBrowserState.fileSystem, sortOptions);
  });

  async function handleDblClick(ev: MouseEvent) {
    if (fileBrowserState.isLoading) return;

    if (hasNoFiles && ev.detail === 2) {
      await resetAndBrowse();
    }
  }

  async function navigateToParentDirectory() {
    if (!fileBrowserState.currentPath || fileBrowserState.isAtRoot) return;

    console.log("Navigating to parent directory from:", fileBrowserState.currentPath);

    const currentPath = fileBrowserState.currentPath;
    const pathParts = currentPath.split(/[/\\]/);
    const parentName = pathParts[pathParts.length - 2] ?? "Parent";

    try {
      await navigateToParent();
    } catch (error) {
      console.error("Failed to navigate to parent directory:", error);
      fileBrowserState.error = `Failed to navigate to ${parentName} directory.`;
    }
  }

  function setSortBy(sortBy: "duration" | "name") {
    if (fileBrowserState.sortBy === sortBy) {
      fileBrowserState.sortDirection = fileBrowserState.sortDirection === "asc" ? "desc" : "asc";
    } else {
      fileBrowserState.sortBy = sortBy;
      fileBrowserState.sortDirection = "asc";
    }
  }

  async function resetAndBrowse() {
    console.log("resetAndBrowse called");

    fileBrowserState.reset();
    queue.clear();
    playerState.reset();

    try {
      fileBrowserState.isLoading = true;
      await loadFileSystemStructure();
    } catch (error) {
      console.error("Failed to browse and load directory:", error);
      fileBrowserState.error = "Failed to load directory. Please try again.";
    } finally {
      fileBrowserState.isLoading = false;
    }
  }
</script>

<div
  class="relative flex h-full flex-col overflow-hidden rounded-xl rounded-b-none bg-zinc-900/50 backdrop-blur-sm"
>
  {#if fileBrowserState.isLoading}
    <div
      class="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm"
      transition:fade={{ duration: 200 }}
    >
      <div class="flex flex-col items-center gap-3">
        <Loader2 class="h-8 w-8 animate-spin text-blue-400" />
        <span class="text-sm font-medium text-zinc-300">Loading...</span>
      </div>
    </div>
  {/if}

  {#if hasNoFiles}
    <div
      class={cn(
        "flex h-full items-center justify-center",
        fileBrowserState.isLoading && "cursor-not-allowed opacity-50"
      )}
      ondblclick={handleDblClick}
      role="button"
      tabindex="0"
    >
      <div class="text-center text-zinc-500">
        {#if fileBrowserState.isLoading}
          <Loader2 size={32} class="mx-auto mb-2 animate-spin opacity-50" />
          <p class="text-sm font-medium">Loading...</p>
        {:else}
          <FolderPlus size={32} class="mx-auto mb-2 opacity-50" />
          <p class="text-sm font-medium">No media files loaded</p>
          <p class="text-xs opacity-75">Double-click to browse</p>
        {/if}
      </div>
    </div>
  {:else}
    <!-- File system list -->
    <div class="no-scrollbar flex-1 overflow-y-auto">
      {#if hasNoFiles}
        <!-- No media files found message -->
        <div class="flex h-full flex-col items-center justify-center p-4 text-center">
          <div class="mb-4 rounded-full bg-zinc-800/50 p-3">
            <AlertCircle class="h-6 w-6 text-zinc-400" />
          </div>
          <h3 class="mb-2 text-base font-medium text-zinc-300">No media files found</h3>
          <p class="mb-4 max-w-xs text-sm text-zinc-500">
            Please upload some media files to get started
          </p>
          <Button />
        </div>
      {:else}
        <div class="space-y-2">
          {#if !fileBrowserState.isAtRoot && fileBrowserState.currentPath}
            <div
              class={cn(
                "group relative z-10 flex min-h-[28px] items-center transition-all duration-200",
                fileBrowserState.isLoading && "cursor-not-allowed opacity-50"
              )}
              onclick={async () => {
                if (fileBrowserState.isLoading) return;
                await navigateToParentDirectory();
              }}
              title="Go back"
            >
              <div class="flex min-h-[28px] w-full items-center rounded-md hover:bg-zinc-800/40">
                <div class="flex min-h-[28px] min-w-0 flex-1 items-center">
                  <span
                    class="ml-4 flex-1 text-sm font-medium text-zinc-300 group-hover:text-zinc-100"
                  >
                    ..
                  </span>
                </div>
              </div>
            </div>
          {/if}
          {#each sortedFileSystem() as item (item.path)}
            <FileBrowserItem {item} depth={0} />
          {/each}
        </div>
      {/if}
    </div>

    <div class="mt-4 border-t border-zinc-800 bg-zinc-900/40 p-1 pb-0">
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-row items-center gap-2">
          <button
            class="flex h-8 items-center gap-1 rounded px-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            class:selected={fileBrowserState.sortBy === "name"}
            aria-pressed={fileBrowserState.sortBy === "name"}
            onclick={() => setSortBy("name")}
            title="Sort by name"
          >
            {#if fileBrowserState.sortBy === "name"}
              {#if fileBrowserState.sortDirection === "asc"}
                <ArrowUpAZ class="h-5 w-5" />
              {:else}
                <ArrowDownAZ class="h-5 w-5" />
              {/if}
            {/if}
            <span>Name</span>
          </button>
          <button
            class="flex h-8 items-center gap-1 rounded px-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            class:selected={fileBrowserState.sortBy === "duration"}
            aria-pressed={fileBrowserState.sortBy === "duration"}
            onclick={() => setSortBy("duration")}
            title="Sort by duration"
          >
            {#if fileBrowserState.sortBy === "duration"}
              {#if fileBrowserState.sortDirection === "asc"}
                <ArrowUp10 class="h-5 w-5" />
              {:else}
                <ArrowDown01 class="h-5 w-5" />
              {/if}
            {/if}
            <span>Duration</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <Button size="icon" variant="ghost" onclick={resetAndBrowse} title="Browse files">
            <ListRestart class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>
