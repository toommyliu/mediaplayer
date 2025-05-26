<script lang="ts">
  import { playlistState } from "@/state.svelte";
  import { PlaylistManager } from "@/utils/playlist";
  import Plus from "lucide-svelte/icons/plus";
  import FileVideo from "lucide-svelte/icons/file-video";
  import Folder from "lucide-svelte/icons/folder";
  import FolderOpen from "lucide-svelte/icons/folder-open";

  import { loadFileBrowser } from "@/utils/ipc";
  import { ICON_SIZE } from "@/constants";
  interface FileBrowserProps {
    onFileSelect?: (filePath: string) => void;
    onFolderSelect?: (folderPath: string) => void;
  }

  let { onFileSelect, onFolderSelect }: FileBrowserProps = $props();

  let fileSystem = $state<FileSystemItem[]>([]);
  let expandedFolders = $state(new Set<string>());
  let error = $state<string | null>(null);

  async function loadFileSystemStructure() {
    try {
      error = null;
      const result = await loadFileBrowser();
      console.log("loadFileBrowser result:", result);

      if (result && result.files && result.files.length > 0) {
        // The first item in files is the root folder, we want its contents
        const rootFolder = result.files[0];
        if (rootFolder.files) {
          fileSystem = transformFileBrowserResult(rootFolder.files);
        } else {
          fileSystem = [];
        }
      } else if (result === null) {
        // User cancelled the dialog
        error = null;
        fileSystem = [];
      } else {
        error = "No video files found in the selected folder";
        fileSystem = [];
      }
    } catch (err) {
      console.error("Failed to load file system:", err);
      error = "Failed to load file system. Please try again.";
      fileSystem = [];
    }
  }

  function transformFileBrowserResult(items: any[]): FileSystemItem[] {
    return items.map((item) => {
      // If item has 'files' property, it's a folder
      if (item.files && Array.isArray(item.files)) {
        return {
          name: item.name,
          type: "folder" as const,
          path: item.path || item.name, // Use path if available, fallback to name
          children: transformFileBrowserResult(item.files)
        };
      } else {
        // It's a video file
        return {
          name: item.name,
          type: "video" as const,
          path: item.path,
          duration: item.duration || 0
          // Remove size calculation based on duration as it's not accurate
        };
      }
    });
  }

  type FileSystemItem = {
    name: string;
    type: "folder" | "video" | "file";
    path: string;
    size?: number;
    duration?: number;
    children?: FileSystemItem[];
  };

  function toggleFolder(path: string) {
    if (expandedFolders.has(path)) {
      expandedFolders.delete(path);
    } else {
      expandedFolders.add(path);
    }
    expandedFolders = new Set(expandedFolders);
  }

  function handleItemClick(item: FileSystemItem) {
    if (item.type === "folder") {
      toggleFolder(item.path);
      onFolderSelect?.(item.path);
    } else if (item.type === "video") {
      onFileSelect?.(item.path);
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

  function formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  function formatDuration(seconds: number): string {
    if (!seconds || seconds === 0) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
</script>

<div class="space-y-2">
  <div class="mb-3 flex items-center justify-between">
    <h3 class="text-sm font-medium text-zinc-300">File Browser</h3>
    <button class="text-xs text-zinc-500 hover:text-zinc-300" onclick={loadFileSystemStructure}>
      Browse...
    </button>
  </div>

  <div class="h-[87vh] overflow-hidden rounded-lg bg-zinc-800 p-3">
    {#if error}
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <div class="mb-2 text-lg">⚠️</div>
        <div class="text-xs text-red-400">{error}</div>
        <button
          class="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
          onclick={loadFileSystemStructure}
        >
          Try again
        </button>
      </div>
    {:else}
      <div class="space-y-1 overflow-hidden text-xs text-zinc-400">
        {#each fileSystem as item}
          {@render FileBrowserItem(item, 0)}
        {/each}
      </div>
    {/if}
  </div>
</div>

{#snippet FileBrowserItem(item: FileSystemItem, depth: number)}
  {@const isExpanded = expandedFolders.has(item.path)}
  {@const paddingLeft = depth * 16}

  <div
    class="group flex min-w-0 cursor-pointer items-center gap-2 rounded p-2 hover:bg-zinc-700"
    style="padding-left: {paddingLeft + 8}px"
  >
    {#if item.type === "folder"}
      <button
        onclick={() => toggleFolder(item.path)}
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
          <span class="flex-shrink-0 text-xs text-blue-400">{formatDuration(item.duration)}</span>
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
        title="Add to current playlist"
      >
        <Plus size={ICON_SIZE - 6} />
      </button>
    {/if}
  </div>

  {#if item.type === "folder" && isExpanded && item.children}
    {#each item.children as child}
      {@render FileBrowserItem(child, depth + 1)}
    {/each}
  {/if}
{/snippet}
