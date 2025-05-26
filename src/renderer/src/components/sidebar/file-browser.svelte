<script lang="ts">
  import { ICON_SIZE } from "@/constants";
  import { loadFileBrowser } from "@/utils/ipc";
  // import { PlaylistManager } from "@/utils/playlist";
  import { playVideo } from "@/utils/video-player";
  import FileVideo from "lucide-svelte/icons/file-video";
  import Folder from "lucide-svelte/icons/folder";
  import FolderOpen from "lucide-svelte/icons/folder-open";
  import * as ContextMenu from "../ui/context-menu/index";
  import { playerState } from "@/state.svelte";

  // interface FileBrowserProps {
  //   onFileSelect?: (filePath: string) => void;
  //   onFolderSelect?: (folderPath: string) => void;
  // }

  // let { onFileSelect, onFolderSelect }: FileBrowserProps = $props();

  let fileSystem = $state<FileSystemItem[]>([]);
  let expandedFolders = $state(new Set<string>());
  let error = $state<string | null>(null);
  let openContextMenu = $state<string | null>(null);

  async function loadFileSystemStructure() {
    try {
      error = null;
      const result = await loadFileBrowser();
      console.log("loadFileBrowser result:", result);

      if (result && result.files && result.files.length > 0) {
        // Transform the entire files array from the root
        fileSystem = transformFileBrowserResult(result.files);

        playerState.queue = fileSystem.flatMap((entry) => `file://${entry.path}`);
        playerState.currentIndex = 0;
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
    return items.map((entry) => {
      if (entry.files && Array.isArray(entry.files)) {
        const pathParts = entry.path.split(/[/\\]/);
        const folderName = pathParts[pathParts.length - 1];

        return {
          name: folderName,
          path: entry.path,
          children: transformFileBrowserResult(entry.files),
          type: "folder" as const
        };
      } else {
        return {
          name: entry.name,
          path: entry.path,
          duration: entry.duration || 0, // TODO: not provided yet
          type: "video" as const
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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy text to clipboard:", err);
    });
  }

  function showInFinder(path: string) {
    window.electron.ipcRenderer.send("open-file-explorer", path);
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

  function openContextMenuForItem(itemPath: string) {
    openContextMenu = itemPath;
  }

  function closeAllContextMenus() {
    openContextMenu = null;
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
  {@const isContextMenuOpen = openContextMenu === item.path}

  <ContextMenu.Root
    open={isContextMenuOpen}
    onOpenChange={(open) => {
      if (open) {
        openContextMenuForItem(item.path);
      } else if (openContextMenu === item.path) {
        closeAllContextMenus();
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
            showInFinder(item.path);
            closeAllContextMenus();
          }}
        >
          Show in Finder
        </ContextMenu.Item>
      {:else if item.type === "folder"}
        <ContextMenu.Item
          onclick={() => {
            toggleFolder(item.path);
            closeAllContextMenus();
          }}
        >
          {isExpanded ? "Collapse" : "Expand"} Folder
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
            showInFinder(item.path);
            closeAllContextMenus();
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
