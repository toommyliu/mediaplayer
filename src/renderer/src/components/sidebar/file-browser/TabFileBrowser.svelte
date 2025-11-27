<script lang="ts">
  import { Button } from "$ui/button";
  import FileBrowserItem from "./FileBrowserItem.svelte";

  import AlertCircle from "~icons/tabler/alert-circle";
  import ArrowDown01 from "~icons/tabler/sort-descending-numbers";
  import ArrowDownAZ from "~icons/tabler/sort-descending-letters";
  import ArrowUp10 from "~icons/tabler/sort-ascending-numbers";
  import ArrowUpAZ from "~icons/tabler/sort-ascending-letters";
  import FolderPlus from "~icons/tabler/folder-plus";
  import ListRestart from "~icons/tabler/refresh";
  import Loader2 from "~icons/tabler/loader-2";

  import { fileBrowserState } from "$lib/state/file-browser.svelte";
  import { playerState } from "$lib/state/player.svelte";

  import { queue } from "$/lib/state/queue.svelte";
  import { cn } from "$lib/utils";

  import { sortFileTree, type SortOptions } from "$shared/index";

  import { fade } from "svelte/transition";

  const hasNoFiles = $derived(() => fileBrowserState.fileSystem.length === 0);

  const sortedFileSystem = $derived(() => {
    const sortOptions: SortOptions = {
      sortBy: fileBrowserState.sortBy,
      sortDirection: fileBrowserState.sortDirection
    };

    return sortFileTree(fileBrowserState.fileSystem, sortOptions);
  });

  let containerWidth = $state(0);
  const isCompact = $derived(containerWidth < 300);

  async function handleDblClick(ev: MouseEvent) {
    if (fileBrowserState.isLoading) return;

    const isDblClick = ev.detail === 2;
    if (isDblClick && hasNoFiles()) await resetAndBrowse();
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
  class="relative flex h-full flex-col overflow-hidden rounded-xl rounded-b-none"
  bind:clientWidth={containerWidth}
>
  {#if fileBrowserState.isLoading}
    <div
      class="bg-background/80 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      transition:fade={{ duration: 200 }}
    >
      <div class="flex flex-col items-center gap-3">
        <Loader2 class="text-primary h-8 w-8 animate-spin" />
        <span class="text-muted-foreground text-sm font-medium">Loading...</span>
      </div>
    </div>
  {/if}

  {#if hasNoFiles()}
    <div
      class={cn(
        "flex h-full items-center justify-center",
        fileBrowserState.isLoading && "cursor-not-allowed opacity-50"
      )}
      ondblclick={handleDblClick}
      role="button"
      tabindex="0"
    >
      <div class="text-muted-foreground text-center">
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
    <div
      class="no-scrollbar flex-1 overflow-y-auto"
      role="listbox"
      aria-activedescendant={fileBrowserState.focusedItemPath ?? undefined}
      tabindex={0}
      onkeydown={(ev: KeyboardEvent) => {
        const triggers = Array.from(
          document.querySelectorAll('[data-item-trigger="true"]')
        ) as HTMLElement[];
        if (triggers.length === 0) return;

        const activeIndex = triggers.findIndex(
          (t) => t.dataset.path === fileBrowserState.focusedItemPath
        );
        if (ev.key === "ArrowDown") {
          ev.preventDefault();
          const next = triggers[Math.max(0, (activeIndex === -1 ? 0 : activeIndex) + 1)];
          next?.focus();
        } else if (ev.key === "ArrowUp") {
          ev.preventDefault();
          const prev = triggers[Math.max(0, (activeIndex === -1 ? 0 : activeIndex) - 1)];
          prev?.focus();
        } else if (ev.key === "Home") {
          ev.preventDefault();
          triggers[0]?.focus();
        } else if (ev.key === "End") {
          ev.preventDefault();
          triggers[triggers.length - 1]?.focus();
        }
      }}
    >
      {#if hasNoFiles()}
        <div class="flex h-full flex-col items-center justify-center p-4 text-center">
          <div class="bg-muted/50 mb-4 rounded-full p-3">
            <AlertCircle class="text-muted-foreground h-6 w-6" />
          </div>
          <h3 class="text-muted-foreground mb-2 text-base font-medium">No media files found</h3>
          <p class="text-muted-foreground mb-4 max-w-xs text-sm">
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
                class="hover:bg-muted/40 flex min-h-[28px] w-full items-center rounded-md"
                style="padding-left: 8px;"
              >
                <div class="mr-2 w-4 flex-shrink-0"></div>

                <div class="flex min-h-[28px] min-w-0 flex-1 items-center">
                  <span
                    class="text-muted-foreground group-hover:text-foreground flex-1 truncate text-sm font-medium"
                  >
                    ..
                  </span>
                </div>
              </div>
            </div>
          {/if}

          {#each sortedFileSystem() as item (item.path)}
            <FileBrowserItem {item} depth={0} {isCompact} />
          {/each}
        </div>
      {/if}
    </div>

    <div class="border-sidebar-border/60 mt-4 rounded-b-md border-t">
      <div class="flex items-center justify-between gap-2 p-3">
        <div class="flex items-center gap-2">
          <Button
            variant={fileBrowserState.sortBy === "name" ? "secondary" : "ghost"}
            size="sm"
            class={cn(
              "h-8 gap-2 text-sm font-medium",
              fileBrowserState.sortBy === "name"
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-muted-foreground"
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
            {#if !isCompact}
              <span class="hidden sm:inline">Name</span>
            {/if}
          </Button>
          <Button
            variant={fileBrowserState.sortBy === "duration" ? "secondary" : "ghost"}
            size="sm"
            class={cn(
              "h-8 gap-2 text-sm font-medium",
              fileBrowserState.sortBy === "duration"
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-muted-foreground"
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
            {#if !isCompact}
              <span class="hidden sm:inline">Duration</span>
            {/if}
          </Button>
        </div>
        <div class="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            class="text-muted-foreground hover:bg-muted/60 hover:text-muted-foreground h-8 w-8"
            onclick={resetAndBrowse}
            title="Reload"
          >
            <ListRestart class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>
