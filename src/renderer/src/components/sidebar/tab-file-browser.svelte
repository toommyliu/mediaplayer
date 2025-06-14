<script lang="ts">
  import { cn } from "@/utils/utils";
  import AlertCircle from "lucide-svelte/icons/alert-circle";
  import ArrowLeft from "lucide-svelte/icons/arrow-left";
  import FileVideo from "lucide-svelte/icons/file-video";
  import Folder from "lucide-svelte/icons/folder";
  import FolderOpen from "lucide-svelte/icons/folder-open";
  import FolderPlus from "lucide-svelte/icons/folder-plus";
  import Loader2 from "lucide-svelte/icons/loader-2";
  import MoveUp from "lucide-svelte/icons/move-up";
  import Play from "lucide-svelte/icons/play";
  import RotateCcw from "lucide-svelte/icons/rotate-ccw";
  import Search from "lucide-svelte/icons/search";
  import X from "lucide-svelte/icons/x";
  import { client, handlers } from "../../tipc";
  import type { FileSystemItem } from "../../state.svelte";
  import { fileBrowserState, platformState, playerState, playlistState } from "../../state.svelte";
  import {
    navigateToParent,
    transformDirectoryContents,
    navigateToDirectory
  } from "../../utils/file-browser.svelte";
  import { playVideo } from "../../utils/video-playback";
  import { showItemInFolder } from "../../utils";
  import { Input } from "../ui/input/";
  import * as ContextMenu from "../ui/context-menu/";
  import { PlaylistManager } from "../../utils/playlist";
  import { fade } from "svelte/transition";

  let isEmpty = $derived(fileBrowserState.fileSystem.length === 0);
  let expandedFoldersArray = $derived([...fileBrowserState.expandedFolders]);

  let filteredAndSortedFileSystem = $derived(() => {
    let items = [...fileBrowserState.fileSystem];

    if (fileBrowserState.searchQuery.trim()) {
      items = filterItemsRecursively(items, fileBrowserState.searchQuery.trim().toLowerCase());
      expandFoldersWithMatches(items);
    }

    return items.sort(compareItems);
  });

  let hasNoSearchResults = $derived(
    fileBrowserState.searchQuery.trim() && filteredAndSortedFileSystem().length === 0
  );

  function filterItemsRecursively(items: FileSystemItem[], query: string): FileSystemItem[] {
    return items
      .filter((item) => {
        const nameMatches = item.name?.toLowerCase().includes(query) || false;

        let hasMatchingChildren = false;
        if (item.type === "folder") {
          const filteredChildren = filterItemsRecursively(item.files, query);
          hasMatchingChildren = filteredChildren.length > 0;

          if (hasMatchingChildren) {
            item = { ...item, files: filteredChildren };
          }
        }

        return nameMatches || hasMatchingChildren;
      })
      .map((item) => {
        if (item.files && fileBrowserState.searchQuery.trim()) {
          return { ...item, files: filterItemsRecursively(item.files, query) };
        }
        return item;
      });
  }

  function expandFoldersWithMatches(items: FileSystemItem[]) {
    for (const item of items) {
      if (item.files && item.path) {
        fileBrowserState.expandedFolders.add(item.path);
        expandFoldersWithMatches(item.files);
      }
    }
  }

  function clearSearch() {
    fileBrowserState.searchQuery = "";
  }

  function handleItemClick(ev: MouseEvent, item: FileSystemItem) {
    if (!item.path || fileBrowserState.isLoading) return;

    console.log("Item clicked:", item);

    if (item.type === "folder") {
      // mod + click to navigate to folder
      const isModKeyPressed = platformState.isMac ? ev.metaKey : ev.ctrlKey;
      if (isModKeyPressed) {
        ev.preventDefault();
        console.log("Cmd/Ctrl + click detected, navigating to:", item.path);
        navigateToDirectory(item.path);
        return;
      }

      // Regular click to toggle folder expansion
      toggleFolder(item.path);
      fileBrowserState.fileTree = { ...fileBrowserState.fileTree! };
    } else if (item.duration !== undefined) {
      console.log("Playing video:", item.path);
      playVideo(`file://${item.path}`);
    }
  }

  async function handleEmptyDblClick(event: MouseEvent) {
    if (isEmpty && event.detail === 2) {
      await resetAndBrowse();
    }
  }

  function navigateToParentDirectory() {
    if (!fileBrowserState.currentPath || fileBrowserState.isAtRoot) return;

    console.log("Navigating to parent directory from:", fileBrowserState.currentPath);

    const currentPath = fileBrowserState.currentPath;
    const pathParts = currentPath.split(/[/\\]/);
    const parentName = pathParts[pathParts.length - 2] || "Parent";

    navigateToParent().catch((err) => {
      console.error("Failed to navigate to parent directory:", err);
      fileBrowserState.error = `Failed to navigate to ${parentName} directory.`;
    });
  }

  function naturalSort(a: string, b: string): number {
    // Split strings into parts, separating numeric and non-numeric segments
    const aParts = a.match(/(\d+|\D+)/g) || [];
    const bParts = b.match(/(\d+|\D+)/g) || [];

    const maxLength = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLength; i++) {
      const aPart = aParts[i] || "";
      const bPart = bParts[i] || "";

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
    const aIsFolder = !!a.files;
    const bIsFolder = !!b.files;

    // Folders first
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    // Apply filter given params
    let comparison = 0;
    if (fileBrowserState.sortBy === "name") {
      const aName = a.name || "";
      const bName = b.name || "";
      comparison = naturalSort(aName, bName);
    } else if (fileBrowserState.sortBy === "duration") {
      if (aIsFolder && bIsFolder) {
        const aName = a.name || "";
        const bName = b.name || "";
        comparison = naturalSort(aName, bName);
      } else {
        const aDuration = a.duration || 0;
        const bDuration = b.duration || 0;

        if (aDuration === bDuration) {
          const aName = a.name || "";
          const bName = b.name || "";
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

  function setSortBy(sortBy: "name" | "duration") {
    if (fileBrowserState.sortBy === sortBy) {
      fileBrowserState.sortDirection = fileBrowserState.sortDirection === "asc" ? "desc" : "asc";
    } else {
      fileBrowserState.sortBy = sortBy;
      fileBrowserState.sortDirection = "asc";
    }
  }

  function renderFileSystemItem(item: FileSystemItem, depth = 0) {
    const isFolder = !!item.files;
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
      loadFolderContents(path);
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
      if (result && result.files) {
        const folderContents = transformDirectoryContents(result);
        updateFolderContents(fileBrowserState.fileSystem, folderPath, folderContents);
      }
    } catch (err) {
      console.error("Failed to load folder contents:", err);
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
      if (items[i].files) {
        if (updateFolderContents(items[i].files!, targetPath, newContents)) {
          return true;
        }
      }
    }
    return false;
  }

  async function resetAndBrowse() {
    console.log("resetAndBrowse called");

    fileBrowserState.fileTree = null;
    fileBrowserState.expandedFolders.clear();
    fileBrowserState.loadingFolders.clear();
    fileBrowserState.searchQuery = "";

    if (
      playlistState.currentPlaylist.id === "default" &&
      playlistState.currentPlaylist.items.length === 0 &&
      !playlistState.hasUnsavedChanges
    ) {
      console.log("!! Clearing default playlist !!");
      PlaylistManager.clearPlaylist(playlistState.currentPlaylistId);
    }

    try {
      fileBrowserState.isLoading = true;
      const res = await client.selectFileOrFolder();
      console.log("Selected file or folder:", res);

      // Single file selected
      if (typeof res === "string") {
        playVideo(`file://${res}`);
        return;
      }

      if (res && res.rootPath) {
        fileBrowserState.originalPath = res.rootPath;

        const dirResult = await client.readDirectory(res.rootPath);
        console.log("Directory result:", dirResult);
        if (dirResult) {
          fileBrowserState.fileTree = {
            rootPath: dirResult.currentPath,
            files: transformDirectoryContents(dirResult)
          };
          console.log("Final files", fileBrowserState.fileTree.files);
          fileBrowserState.currentPath = dirResult.currentPath;
          fileBrowserState.isAtRoot = dirResult.isAtRoot;
          console.log(
            "Set state - currentPath:",
            fileBrowserState.currentPath,
            "isAtRoot:",
            fileBrowserState.isAtRoot
          );

          const allFiles = fileBrowserState.fileTree.files;
          const videoFiles = allFiles.filter(
            (file) => file.type === "video" && file.duration !== undefined && file.path && file.name
          );

          console.log(`[FileBrowser] Found ${videoFiles.length} video files in directory`);

          if (videoFiles.length > 0) {
            console.log(`[FileBrowser] Attempting to add ${videoFiles.length} videos to playlist`);
            const success = PlaylistManager.addFolderContentsToCurrentPlaylist(
              videoFiles.map((file) => ({
                name: file.name!,
                path: file.path!,
                duration: file.duration
              }))
            );
            console.log(`[FileBrowser] Add to playlist result: ${success}`);

            if (success) {
              console.log(
                `[FileBrowser] Successfully added ${videoFiles.length} videos to current playlist`
              );
            } else {
              console.warn(`[FileBrowser] Failed to add videos to playlist`);
            }
          } else {
            console.log("[FileBrowser] No video files found to add to playlist");
          }
        }
      }
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

  {#if isEmpty}
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
    <!-- File Browser Header -->
    <div class="border-b border-zinc-800/50 bg-zinc-900/30">
      <!-- Path and navigation row -->
      <div class="flex items-center gap-2 p-3">
        <!-- Current directory path display -->
        {#if fileBrowserState.currentPath}
          <div
            class="flex-1 overflow-hidden rounded bg-zinc-800/30 px-3 py-2"
            title={fileBrowserState.currentPath}
          >
            <span class="truncate text-xs text-zinc-400">
              {fileBrowserState.currentPath}
            </span>
          </div>
        {/if}

        <!-- Reset button -->
        <button
          onclick={resetAndBrowse}
          class="flex items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-2 text-blue-400 transition-all duration-200 hover:border-blue-600/40 hover:bg-blue-950/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
          title="Reset and browse new folder"
          disabled={fileBrowserState.isLoading}
        >
          {#if fileBrowserState.isLoading}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            <RotateCcw class="h-4 w-4" />
          {/if}
        </button>
      </div>

      <!-- Search input -->
      <div class="px-3 pb-3">
        <div class="relative">
          <Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search files and folders..."
            bind:value={fileBrowserState.searchQuery}
            class="w-full rounded-md border border-zinc-700/50 bg-zinc-800/50 py-2 pr-10 pl-10 text-sm text-zinc-200 placeholder-zinc-500 transition-all duration-200 focus:border-blue-500/50 focus:bg-zinc-800/70 focus:ring-1 focus:ring-blue-500/30 focus:outline-none"
          />
          {#if fileBrowserState.searchQuery}
            <button
              onclick={clearSearch}
              class="absolute top-1/2 right-3 -translate-y-1/2 rounded p-0.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-700/40 hover:text-zinc-300"
              title="Clear search"
            >
              <X class="h-4 w-4" />
            </button>
          {/if}
        </div>
      </div>

      <!-- Sort controls -->
      <div
        class="flex items-center justify-between border-t border-zinc-800/50 bg-zinc-900/10 px-3 py-2"
      >
        <div class="flex items-center gap-2">
          <span class="text-xs text-zinc-500">Sort by:</span>
          <div class="flex gap-1">
            <button
              onclick={() => setSortBy("name")}
              class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all duration-200 {fileBrowserState.sortBy ===
              'name'
                ? 'border border-blue-500/40 bg-blue-500/20 text-blue-200'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'}"
            >
              Name
              {#if fileBrowserState.sortBy === "name"}
                <MoveUp
                  class={cn("h-3 w-3", {
                    "rotate-180": fileBrowserState.sortDirection === "desc"
                  })}
                />
              {/if}
            </button>
            <button
              onclick={() => setSortBy("duration")}
              class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all duration-200 {fileBrowserState.sortBy ===
              'duration'
                ? 'border border-blue-500/40 bg-blue-500/20 text-blue-200'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'}"
            >
              Duration
              {#if fileBrowserState.sortBy === "duration"}
                <MoveUp
                  class={cn("h-3 w-3", {
                    "rotate-180": fileBrowserState.sortDirection === "desc"
                  })}
                />
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- File system list -->
    <div class="no-scrollbar flex-1 overflow-y-auto">
      {#if hasNoSearchResults}
        <!-- No search results found message -->
        <div class="flex h-full flex-col items-center justify-center p-4 text-center">
          <div class="mb-4 rounded-full bg-zinc-800/50 p-3">
            <AlertCircle class="h-6 w-6 text-zinc-400" />
          </div>
          <h3 class="mb-2 text-base font-medium text-zinc-300">No results found</h3>
          <p class="mb-4 max-w-xs text-sm text-zinc-500">
            No files or folders match your search query
          </p>
          <button
            onclick={clearSearch}
            class="flex items-center gap-2 rounded-lg bg-blue-800/40 px-4 py-2 text-xs font-medium text-blue-300 transition-all duration-200 hover:bg-blue-800/60 hover:text-blue-200"
          >
            <X class="h-3.5 w-3.5" />
            Clear search
          </button>
        </div>
      {:else}
        <div class="-ml-4 space-y-1 p-0">
          {#if !fileBrowserState.isAtRoot && fileBrowserState.currentPath}
            <div
              class="group flex cursor-pointer items-center rounded py-2 pr-[12px] transition-all duration-200 hover:bg-zinc-800/50 disabled:cursor-not-allowed disabled:opacity-50"
              onclick={fileBrowserState.isLoading ? undefined : navigateToParentDirectory}
              title="Go back"
              class:opacity-50={fileBrowserState.isLoading}
              class:cursor-not-allowed={fileBrowserState.isLoading}
            >
              <div class="mr-2 w-4 flex-shrink-0"></div>
              <div class="mr-2 flex-shrink-0">
                {#if fileBrowserState.isLoading}
                  <Loader2 class="h-4 w-4 animate-spin text-blue-400" />
                {:else}
                  <ArrowLeft class="h-4 w-4 text-blue-400" />
                {/if}
              </div>
              <span class="flex-1 truncate text-sm text-zinc-300 group-hover:text-zinc-100">
                ..
              </span>
            </div>
          {/if}
          {#each filteredAndSortedFileSystem() as item}
            {@render FileSystemItemComponent(item, 0)}
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#snippet FileSystemItemComponent(item: FileSystemItem, depth: number)}
  {@const fileItemView = renderFileSystemItem(item, depth)}
  {@const displayDuration = item.duration || 0}

  {#key expandedFoldersArray}
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
      <ContextMenu.Trigger>
        <div
          class={cn(
            "group relative flex cursor-pointer items-center rounded py-2 pr-[12px] transition-all duration-200",
            fileItemView.isCurrentlyPlaying
              ? "border border-blue-500/30 bg-blue-500/20 hover:bg-blue-500/25"
              : "hover:bg-zinc-800/40",
            fileBrowserState.isLoading && "cursor-not-allowed opacity-50"
          )}
          style={`padding-left: ${depth * 16 + 16}px;`}
          onclick={(ev) => handleItemClick(ev, item)}
        >
          <div class="mr-2 w-4 flex-shrink-0">
            {#if fileItemView.isFolder}
              <button
                onclick={(ev) => {
                  ev.stopPropagation();
                  toggleFolder(item.path);
                }}
                class="flex h-4 w-4 items-center justify-center rounded transition-colors duration-200 hover:bg-zinc-700/40"
                disabled={fileItemView.isLoading}
              >
                {#if fileItemView.isLoading}
                  <Loader2 class="h-3 w-3 animate-spin text-zinc-400" />
                {/if}
              </button>
            {/if}
          </div>

          <div class="mr-2 flex-shrink-0">
            {#if fileItemView.isFolder}
              {#if fileItemView.isExpanded}
                <FolderOpen class="h-4 w-4 text-amber-300" />
              {:else}
                <Folder class="h-4 w-4 text-amber-300" />
              {/if}
            {:else if fileItemView.isVideo}
              <div class="relative">
                <FileVideo
                  class={cn(
                    "h-4 w-4",
                    fileItemView.isCurrentlyPlaying ? "text-blue-400" : "text-emerald-400"
                  )}
                />
                {#if fileItemView.isCurrentlyPlaying}
                  <div
                    class="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 ring-1 ring-blue-400/50"
                  >
                    <Play class="h-1.5 w-1.5 fill-white text-white" />
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Content -->
          <div class="flex min-w-0 flex-1 items-center" title={item.name!}>
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
            </span>

            {#if fileItemView.isVideo}
              <span
                class={cn(
                  "ml-3 flex-shrink-0 rounded-sm px-2 py-1 font-mono text-xs ring-1",
                  fileItemView.isCurrentlyPlaying
                    ? "bg-blue-900/40 text-blue-200 ring-blue-700/40"
                    : "bg-emerald-900/30 text-emerald-300 ring-emerald-700/30"
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
              console.log("Adding to playlist:", item);
              if (item.path && item.name) {
                PlaylistManager.addItemToPlaylist(playlistState.currentPlaylistId, {
                  name: item.name,
                  path: item.path,
                  duration: item.duration
                });
              }
            }}
          >
            Add to Playlist
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
      {#each fileItemView.item.files as child}
        {@render FileSystemItemComponent(child, fileItemView.depth + 1)}
      {/each}
    {/if}
  {/key}
{/snippet}
