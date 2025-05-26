<script lang="ts">
  import { Shuffle, Trash2, FileText, X } from "lucide-svelte";

  interface PlaylistItem {
    id: string;
    name: string;
    path: string;
    duration?: number;
    size?: number;
  }

  interface PlaylistProps {
    items: PlaylistItem[];
    currentItem: string | null;
    onPlay: (item: PlaylistItem) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onShuffle: () => void;
  }

  let { items, currentItem, onPlay, onRemove, onClear, onShuffle }: PlaylistProps = $props();

  function formatFileSize(bytes?: number): string {
    if (!bytes) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
</script>

<div class="flex h-full flex-col">
  <!-- Playlist Header -->
  <div class="border-player-border border-b p-4">
    <div class="mb-2 flex items-center justify-between">
      <h3 class="text-player-text text-sm font-medium">Playlist ({items.length})</h3>
      <div class="flex space-x-1">
        <button
          onclick={onShuffle}
          class="bg-player-surface hover:bg-player-border text-player-text-secondary hover:text-player-text rounded px-2 py-1 text-xs transition-colors"
          title="Shuffle playlist"
        >
          <Shuffle size={12} />
        </button>
        <button
          onclick={onClear}
          class="bg-player-error rounded px-2 py-1 text-xs text-white transition-colors hover:bg-red-600"
          title="Clear playlist"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if items.length === 0}
      <div class="text-player-text-secondary p-4 text-center">
        <div class="mb-2 flex justify-center text-2xl">
          <FileText size={32} />
        </div>
        <p class="text-sm">No items in playlist</p>
      </div>
    {:else}
      {#each items as item (item.id)}
        <div
          class="border-player-border/50 hover:bg-player-surface/50 group flex cursor-pointer items-center border-b p-3 transition-colors"
          class:bg-player-surface={currentItem === item.id}
          onclick={() => onPlay(item)}
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-2">
              {#if currentItem === item.id}
                <div class="bg-player-accent h-2 w-2 rounded-full"></div>
              {/if}
              <h4 class="text-player-text truncate text-sm font-medium">{item.name}</h4>
            </div>
            <div class="text-player-text-secondary mt-1 flex items-center space-x-2 text-xs">
              {#if item.duration}
                <span>{formatDuration(item.duration)}</span>
              {/if}
              {#if item.size}
                <span>•</span>
                <span>{formatFileSize(item.size)}</span>
              {/if}
            </div>
          </div>

          <button
            onclick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            class="text-player-text-secondary hover:text-player-error p-1 opacity-0 transition-all group-hover:opacity-100"
            title="Remove from playlist"
          >
            <X size={14} />
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>
