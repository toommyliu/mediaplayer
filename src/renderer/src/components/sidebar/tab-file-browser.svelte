<script lang="ts">
  import AlertCircle from "lucide-svelte/icons/alert-circle";
  import ArrowDown01 from "lucide-svelte/icons/arrow-down-01";
  import ArrowDownAZ from "lucide-svelte/icons/arrow-down-a-z";
  import ArrowUp10 from "lucide-svelte/icons/arrow-up-10";
  import ArrowUpAZ from "lucide-svelte/icons/arrow-up-a-z";
  import FolderPlus from "lucide-svelte/icons/folder-plus";
  import ListRestart from "lucide-svelte/icons/list-restart";
  import Loader2 from "lucide-svelte/icons/loader-2";
  import { fade } from "svelte/transition";
  import { client } from "$/tipc";
  import {
    getAllVideoFilesRecursive,
    loadFileSystemStructure,
    navigateToDirectory,
    navigateToParent,
    transformDirectoryContents
  } from "$lib/file-browser.svelte";
  import { QueueManager } from "$lib/queue-manager";
  import { showItemInFolder } from "$lib/showItemInFolder";
  import { fileBrowserState, type FileSystemItem } from "$lib/state/file-browser.svelte";
  import { platformState } from "$lib/state/platform.svelte";
  import { playerState } from "$lib/state/player.svelte";
  import { cn } from "$lib/utils";
  import { playVideo } from "$lib/video-playback";
  import Button from "$ui/button/button.svelte";
  import * as ContextMenu from "$ui/context-menu/";

  const hasNoFiles = $derived(fileBrowserState.fileSystem.length === 0);

  const sortedFileSystem = $derived(() => [...fileBrowserState.fileSystem].sort(compareItems));

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

  async function handleEmptyDblClick(event: MouseEvent) {
    if (hasNoFiles && event.detail === 2) {
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

  function naturalSort(a: string, b: string): number {
    // Split strings into parts, separating numeric and non-numeric segments
    const aParts = a.match(/\d+|\D+/g) ?? [];
    const bParts = b.match(/\d+|\D+/g) ?? [];

    const maxLength = Math.max(aParts.length, bParts.length);

    for (let idx = 0; idx < maxLength; idx++) {
      const aPart = aParts[idx] ?? "";
      const bPart = bParts[idx] ?? "";

      // If both parts are numeric, compare as numbers
      const aNum = Number.parseInt(aPart, 10);
      const bNum = Number.parseInt(bPart, 10);

      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
      } else {
        // Compare as strings with locale awareness
        const comparison = aPart.localeCompare(bPart, undefined, {
          numeric: true,
          sensitivity: "base"
        });
        if (comparison !== 0) {
          return comparison;
        }
      }
    }

    return 0;
  }

  function compareItems(a: FileSystemItem, b: FileSystemItem): number {
    const aIsFolder = Boolean(a.files);
    const bIsFolder = Boolean(b.files);

    // Folders first
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    // Apply filter given params
    let comparison = 0;
    if (fileBrowserState.sortBy === "name") {
      const aName = a.name ?? "";
      const bName = b.name ?? "";
      comparison = naturalSort(aName, bName);
    } else if (fileBrowserState.sortBy === "duration") {
      if (aIsFolder && bIsFolder) {
        const aName = a.name ?? "";
        const bName = b.name ?? "";
        comparison = naturalSort(aName, bName);
      } else {
        const aDuration = a.duration ?? 0;
        const bDuration = b.duration ?? 0;

        if (aDuration === bDuration) {
          const aName = a.name ?? "";
          const bName = b.name ?? "";
          comparison = naturalSort(aName, bName);
        } else {
          if (aDuration === 0 && bDuration > 0) return 1;
          if (bDuration === 0 && aDuration > 0) return -1;
          comparison = aDuration - bDuration;
        }
      }
    }

    // Apply sort direction
    return fileBrowserState.sortDirection === "desc" ? -comparison : comparison;
  }

  function setSortBy(sortBy: "duration" | "name") {
    if (fileBrowserState.sortBy === sortBy) {
      fileBrowserState.sortDirection = fileBrowserState.sortDirection === "asc" ? "desc" : "asc";
    } else {
      fileBrowserState.sortBy = sortBy;
      fileBrowserState.sortDirection = "asc";
    }
  }

  function renderFileSystemItem(item: FileSystemItem, depth = 0) {
    const isFolder = Boolean(item.files);
    const isVideo = !isFolder && item.duration !== undefined;
    const isExpanded = item.path ? fileBrowserState.expandedFolders.has(item.path) : false;
    const isCurrentlyPlaying =
      isVideo && item.path && playerState.currentVideo === `file://${item.path}`;
    const isLoading = item.path ? fileBrowserState.loadingFolders.has(item.path) : false;

    const sortedChildren = item.files ? [...item.files].sort(compareItems) : undefined;

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
    for (let i = 0; i < items.length; i++) {
      if (items[i].path === targetPath && items[i].files !== undefined) {
        items[i] = { ...items[i], files: newContents };
        fileBrowserState.fileTree = { ...fileBrowserState.fileTree! };
        return true;
      }

      if (items[i].files && updateFolderContents(items[i].files!, targetPath, newContents)) {
        return true;
      }
    }

    return false;
  }

  async function resetAndBrowse() {
    console.log("resetAndBrowse called");

    fileBrowserState.fileTree = null;
    fileBrowserState.expandedFolders.clear();
    fileBrowserState.loadingFolders.clear();

    // Clear the existing queue when browsing a new folder
    QueueManager.clearQueue();
    playerState.currentTime = 0;
    playerState.duration = 0;

    try {
      fileBrowserState.isLoading = true;

      // Use the centralized loadFileSystemStructure function
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
  <!-- Loading overlay -->
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
      class="flex h-full cursor-pointer items-center justify-center"
      ondblclick={fileBrowserState.isLoading ? undefined : handleEmptyDblClick}
      role="button"
      tabindex="0"
      class:cursor-not-allowed={fileBrowserState.isLoading}
      class:opacity-50={fileBrowserState.isLoading}
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
                "group relative z-10 flex min-h-[28px] cursor-pointer items-center transition-all duration-200",
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
            {@render FileSystemItemComponent(item, 0)}
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

{#snippet FileSystemItemComponent(item: FileSystemItem, depth: number)}
  {@const fileItemView = renderFileSystemItem(item, depth)}
  {@const displayDuration = item.duration ?? 0}

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
          "group relative z-10 flex min-h-[28px] cursor-pointer items-center transition-all duration-200",
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

          <!-- Content -->
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
      {#each fileItemView.item.files as child (`${child.path}-${child.name}`)}
        <!-- eslint-disable-next-line @typescript-eslint/no-confusing-void-expression, sonarjs/no-use-of-empty-return-value -->
        {@render FileSystemItemComponent(child, fileItemView.depth + 1)}
      {/each}
    {/if}
  {/key}
{/snippet}
