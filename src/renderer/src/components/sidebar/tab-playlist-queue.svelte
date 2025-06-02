<script lang="ts">
  import ArrowDown from "lucide-svelte/icons/arrow-down";
  import ArrowUp from "lucide-svelte/icons/arrow-up";
  import Music from "lucide-svelte/icons/music";
  import Play from "lucide-svelte/icons/play";
  import Save from "lucide-svelte/icons/save";
  import Trash2 from "lucide-svelte/icons/trash-2";
  import X from "lucide-svelte/icons/x";
  import { playerState, playlistState } from "../../state.svelte";
  import { PlaylistManager } from "../../utils/playlist";
  import { makeTimeString } from "../../utils/time";
  import { playVideo } from "../../utils/video-playback";
  import PlaylistSelector from "./playlist-selector.svelte";

  console.log(
    `Playlist tab loaded. Current playlist: ${playlistState.currentPlaylistId}, Items: ${playlistState.currentPlaylistItems.length}`
  );
  if (playlistState.currentPlaylist) {
    console.log(`Current playlist name: ${playlistState.currentPlaylist.name}`);
  } else {
    console.log("No current playlist available");
  }

  function isCurrentlyPlaying(item: any): boolean {
    if (!playerState.currentVideo) return false;
    const itemPath = `file://${item.path}`;
    return playerState.currentVideo === itemPath;
  }

  function handleItemClick(item: any) {
    const videoSrc = `file://${item.path}`;
    playVideo(videoSrc);
  }

  function removeFromPlaylist(itemId: string) {
    PlaylistManager.removeItemFromPlaylist(playlistState.currentPlaylistId, itemId);
  }

  function moveItemUp(index: number) {
    if (index > 0) {
      PlaylistManager.moveItem(playlistState.currentPlaylistId, index, index - 1);
    }
  }

  function moveItemDown(index: number) {
    if (index < playlistState.currentPlaylistItems.length - 1) {
      PlaylistManager.moveItem(playlistState.currentPlaylistId, index, index + 1);
    }
  }

  function clearPlaylist() {
    if (confirm("Clear current playlist?")) {
      PlaylistManager.clearPlaylist(playlistState.currentPlaylistId);
    }
  }

  function savePlaylist() {
    PlaylistManager.saveCurrentState();
    console.log("Playlist saved to storage");

    // Show temporary feedback
    showSaveConfirmation();
  }

  let showSavedMessage = $state(false);

  function showSaveConfirmation() {
    showSavedMessage = true;
    setTimeout(() => {
      showSavedMessage = false;
    }, 2000);
  }

  function getFileNameFromPath(path: string): string {
    return path.split("/").pop() || path.split("\\").pop() || path;
  }

  function formatDuration(duration: number): string {
    return makeTimeString(duration);
  }
</script>

<div class="flex h-full flex-col">
  <!-- Playlist Header -->
  <div class="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
    <div class="flex items-center gap-2">
      <h2 class="m-0 text-sm font-medium text-zinc-200">
        {playlistState.currentPlaylist?.name || "Playlist"}
      </h2>
      {#if playlistState.hasUnsavedChanges}
        <div class="flex items-center gap-1.5 text-xs text-zinc-400">
          <div class="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
          <span class="italic">Unsaved</span>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-1">
      {#if playlistState.hasUnsavedChanges}
        <button
          class="flex h-7 w-7 items-center justify-center rounded-md border-none bg-transparent text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          title="Save changes"
          onclick={savePlaylist}
        >
          <Save size={14} />
        </button>
      {/if}
      <button
        class="flex h-7 w-7 items-center justify-center rounded-md border-none bg-transparent text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        title="Clear playlist"
        onclick={clearPlaylist}
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>

  <!-- Playlist Selector -->
  <PlaylistSelector />

  <!-- Queue Items -->
  <div class="flex-1 overflow-y-auto">
    {#if playlistState.currentPlaylistItems.length === 0}
      <div class="flex h-full items-center justify-center">
        <div class="text-center text-zinc-500">
          <Music size={32} class="mx-auto mb-2 opacity-50" />
          <p class="text-sm font-medium">No videos in playlist</p>
          <p class="text-xs opacity-75">Open a folder to add videos</p>
        </div>
      </div>
    {:else}
      <div class="space-y-1">
        {#each playlistState.currentPlaylistItems as item, index (item.id)}
          <div
            class="group flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm transition-colors {isCurrentlyPlaying(
              item
            )
              ? 'bg-blue-500/20 text-blue-400'
              : 'hover:bg-zinc-800/50'}"
            role="button"
            tabindex="0"
            onclick={() => handleItemClick(item)}
            onkeydown={(e) => e.key === "Enter" && handleItemClick(item)}
          >
            <!-- Play Icon or Index -->
            <div class="flex h-5 w-5 shrink-0 items-center justify-center">
              {#if isCurrentlyPlaying(item)}
                <Play size={12} class="fill-current" />
              {:else}
                <span class="text-xs text-zinc-500">{index + 1}</span>
              {/if}
            </div>

            <!-- Video Info -->
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium text-zinc-200">
                {item.name || getFileNameFromPath(item.path)}
              </div>
              {#if item.duration}
                <div class="text-xs text-zinc-500">
                  {formatDuration(item.duration)}
                </div>
              {/if}
            </div>

            <!-- Actions -->
            <div
              class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
                title="Move up"
                onclick={(e) => {
                  e.stopPropagation();
                  moveItemUp(index);
                }}
                disabled={index === 0}
              >
                <ArrowUp size={12} />
              </button>
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
                title="Move down"
                onclick={(e) => {
                  e.stopPropagation();
                  moveItemDown(index);
                }}
                disabled={index === playlistState.currentPlaylistItems.length - 1}
              >
                <ArrowDown size={12} />
              </button>
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-red-400"
                title="Remove from playlist"
                onclick={(e) => {
                  e.stopPropagation();
                  removeFromPlaylist(item.id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
