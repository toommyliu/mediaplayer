<script lang="ts">
  import { Button } from "$ui/button";
  import FileBrowserItem from "./FileBrowserItem.svelte";

  import AlertCircle from "~icons/lucide/alert-circle";
  import ArrowDown01 from "~icons/lucide/arrow-down-01";
  import ArrowDownAZ from "~icons/lucide/arrow-down-a-z";
  import ArrowUp10 from "~icons/lucide/arrow-up-10";
  import ArrowUpAZ from "~icons/lucide/arrow-up-a-z";
  import FolderPlus from "~icons/lucide/folder-plus";
  import ListRestart from "~icons/lucide/list-restart";
  import Loader2 from "~icons/lucide/loader-2";

  import { fileBrowserState } from "$lib/state/file-browser.svelte";
  import { playerState } from "$lib/state/player.svelte";

  import { queue } from "$/lib/state/queue.svelte";
  import { cn } from "$lib/utils";

  import { sortFileTree, type SortOptions } from "$shared/file-tree-utils";

  import { fade } from "svelte/transition";

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

    const isDblClick = ev.detail === 2;

    if (isDblClick && hasNoFiles) await resetAndBrowse();
  }

  async function navigateToParentDirectory() {
    if (!fileBrowserState.currentPath || fileBrowserState.isAtRoot) return;

    console.log("Navigating to parent directory from:", fileBrowserState.currentPath);

    const currentPath = fileBrowserState.currentPath;
    const pathParts = currentPath.split(/[/\\]/);
    const parentName = pathParts[pathParts.length - 2] ?? "Parent";

    try {
      await fileBrowserState.navigateToParent();
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
      await fileBrowserState.loadFileSystemStructure();
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
          <Loader2 class="mx-auto mb-2 size-8 animate-spin opacity-50" />
          <p class="text-sm font-medium">Loading...</p>
        {:else}
          <FolderPlus class="mx-auto mb-2 size-8 opacity-50" />
          <p class="text-sm font-medium">No media files loaded</p>
          <p class="text-xs opacity-75">Double-click to browse</p>
        {/if}
      </div>
    </div>
  {:else}
    <div class="no-scrollbar flex-1 overflow-y-auto">
      {#if hasNoFiles}
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
            >
              <div
                class="flex min-h-[28px] w-full items-center rounded-md hover:bg-zinc-800/40"
                style="padding-left: 8px;"
              >
                <div class="mr-2 w-4 flex-shrink-0"></div>

                <div class="flex min-h-[28px] min-w-0 flex-1 items-center">
                  <span
                    class="flex-1 truncate text-sm font-medium text-zinc-300 group-hover:text-zinc-100"
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

    <div class="mt-4 border-t border-zinc-800/60 backdrop-blur-sm">
      <div
        class="flex flex-col items-center gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
      >
        <div
          class="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:w-auto sm:justify-start"
        >
          <Button
            variant={fileBrowserState.sortBy === "name" ? "secondary" : "ghost"}
            size="sm"
            class={cn(
              "h-8 gap-2 text-sm font-medium",
              fileBrowserState.sortBy === "name"
                ? "border-blue-500/30 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-300"
            )}
            onclick={() => setSortBy("name")}
          >
            {#if fileBrowserState.sortBy === "name"}
              {#if fileBrowserState.sortDirection === "asc"}
                <ArrowUpAZ class="h-4 w-4" />
              {:else}
                <ArrowDownAZ class="h-4 w-4" />
              {/if}
            {:else}
              <ArrowUpAZ class="h-4 w-4 opacity-60" />
            {/if}
            <span class="hidden sm:inline">Name</span>
          </Button>
          <Button
            variant={fileBrowserState.sortBy === "duration" ? "secondary" : "ghost"}
            size="sm"
            class={cn(
              "h-8 gap-2 text-sm font-medium",
              fileBrowserState.sortBy === "duration"
                ? "border-blue-500/30 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-300"
            )}
            onclick={() => setSortBy("duration")}
          >
            {#if fileBrowserState.sortBy === "duration"}
              {#if fileBrowserState.sortDirection === "asc"}
                <ArrowUp10 class="h-4 w-4" />
              {:else}
                <ArrowDown01 class="h-4 w-4" />
              {/if}
            {:else}
              <ArrowUp10 class="h-4 w-4 opacity-60" />
            {/if}
            <span class="hidden sm:inline">Duration</span>
          </Button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          class="mt-2 h-8 w-full text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-300 sm:mt-0 sm:ml-auto sm:w-8"
          onclick={resetAndBrowse}
        >
          <ListRestart class="h-4 w-4" />
        </Button>
      </div>
    </div>
  {/if}
</div>
