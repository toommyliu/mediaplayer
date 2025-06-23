<script lang="ts">
  import IconArrowDown from "lucide-svelte/icons/arrow-down";
  import IconArrowUp from "lucide-svelte/icons/arrow-up";
  import IconMusic from "lucide-svelte/icons/music";
  import IconSave from "lucide-svelte/icons/save";
  import IconTrash2 from "lucide-svelte/icons/trash-2";
  import IconX from "lucide-svelte/icons/x";
  import * as AlertDialog from "@/components/ui/alert-dialog";
  import { ICON_SIZE } from "@/constants";
  import { playerState, playlistState } from "@/state.svelte";
  import { makeTimeString } from "@/utils/makeTimeString";
  import { PlaylistManager } from "@/utils/playlist-manager";
  import { cn } from "@/utils/utils";
  import { playVideo } from "@/utils/video-playback";
  import PlaylistSelector from "./tab-playlist/playlist-selector.svelte";

  let showClearDialog = $state(false);

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
    const itemToRemove = playlistState.currentPlaylistItems.find((item) => item.id === itemId);

    // Are we trying to remove the currently playing video?
    if (itemToRemove && isCurrentlyPlaying(itemToRemove)) {
      const currentIndex = playlistState.currentPlaylistItems.findIndex(
        (item) => item.id === itemId
      );
      const playlistLength = playlistState.currentPlaylistItems.length;

      let nextVideoToPlay: string | null = null;

      if (playlistLength > 1) {
        // Determine the next video to play after removal
        if (currentIndex < playlistLength - 1) {
          const nextItem = playlistState.currentPlaylistItems[currentIndex + 1];
          nextVideoToPlay = `file://${nextItem.path}`;
        } else if (currentIndex > 0) {
          const prevItem = playlistState.currentPlaylistItems[currentIndex - 1];
          nextVideoToPlay = `file://${prevItem.path}`;
        }
      }

      PlaylistManager.removeItemFromPlaylist(playlistState.currentPlaylistId, itemId);

      if (nextVideoToPlay) {
        playVideo(nextVideoToPlay);
      } else if (playerState.videoElement) {
        playerState.videoElement.pause();
        playerState.isPlaying = false;
        playerState.currentTime = 0;
      }
    } else {
      PlaylistManager.removeItemFromPlaylist(playlistState.currentPlaylistId, itemId);
    }
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
    showClearDialog = true;
  }

  function confirmClearPlaylist() {
    PlaylistManager.clearPlaylist(playlistState.currentPlaylistId);
    showClearDialog = false;
  }

  function savePlaylist() {
    PlaylistManager.saveCurrentState();
  }
</script>

<div class="flex h-full flex-col">
  <!-- Playlist Header -->
  <div class="mb-4 border-b border-zinc-800 px-4 pb-3">
    {#if playlistState.hasUnsavedChanges}
      <div class="mb-2 flex justify-end">
        <div class="flex items-center gap-1.5 text-xs text-zinc-400">
          <div class="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
          <span class="italic">Unsaved</span>
        </div>
      </div>
    {/if}

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="m-0 text-sm font-medium text-zinc-200">
          {playlistState.currentPlaylist?.name ?? "Playlist"}
        </h2>
      </div>

      <div class="flex items-center gap-1">
        {#if playlistState.hasUnsavedChanges}
          <button
            class="flex h-7 w-7 items-center justify-center rounded-md border-none bg-transparent text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            title="Save changes"
            onclick={savePlaylist}
          >
            <IconSave size={ICON_SIZE - 4} />
          </button>
        {/if}
        <button
          class="flex h-7 w-7 items-center justify-center rounded-md border-none bg-transparent text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          title="Clear playlist"
          onclick={clearPlaylist}
        >
          <IconTrash2 size={ICON_SIZE - 4} />
        </button>
      </div>
    </div>
  </div>

  <PlaylistSelector />

  <!-- Queue Items -->
  <div class="no-scrollbar flex-1 overflow-y-auto">
    {#if playlistState.currentPlaylistItems.length === 0}
      <div class="flex h-full items-center justify-center">
        <div class="text-center text-zinc-500">
          <IconMusic size={32} class="mx-auto mb-2 opacity-50" />
          <p class="text-sm font-medium">No videos in playlist</p>
          <p class="text-xs opacity-75">Open a folder to add videos</p>
        </div>
      </div>
    {:else}
      <div class="space-y-1">
        {#each playlistState.currentPlaylistItems as item, index (item.id)}
          <div
            class={cn(
              "group flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm transition-colors",
              isCurrentlyPlaying(item)
                ? "bg-blue-500/20 text-blue-400"
                : "text-zinc-200 hover:bg-zinc-800/50"
            )}
            role="button"
            tabindex="0"
            onclick={() => handleItemClick(item)}
            onkeydown={(ev) => ev.key === "Enter" && handleItemClick(item)}
          >
            <div class="flex h-5 w-5 shrink-0 items-center justify-center">
              <span class="text-xs text-zinc-500">{index + 1}</span>
            </div>

            <!-- Video Info -->
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium text-zinc-200">
                {item.name ?? "Unknown Video"}
              </div>
              {#if item.duration}
                <div class="text-xs text-zinc-500">
                  {makeTimeString(item.duration)}
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
                onclick={(ev) => {
                  ev.stopPropagation();
                  moveItemUp(index);
                }}
                disabled={index === 0}
              >
                <IconArrowUp size={ICON_SIZE - 6} />
              </button>
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
                title="Move down"
                onclick={(ev) => {
                  ev.stopPropagation();
                  moveItemDown(index);
                }}
                disabled={index === playlistState.currentPlaylistItems.length - 1}
              >
                <IconArrowDown size={ICON_SIZE - 6} />
              </button>
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-red-400"
                title="Remove from playlist"
                onclick={(ev) => {
                  ev.stopPropagation();
                  removeFromPlaylist(item.id);
                }}
              >
                <IconX size={ICON_SIZE - 6} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Clear Playlist Confirmation Dialog -->
<AlertDialog.Root bind:open={showClearDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Clear Playlist</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to clear the current playlist? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmClearPlaylist}>Clear Playlist</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
