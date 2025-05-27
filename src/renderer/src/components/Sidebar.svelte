<script lang="ts">
  import * as Tabs from "./ui/tabs/index";
  import FileBrowser from "./sidebar/file-browser.svelte";
  import PlaylistSelector from "./sidebar/playlist-selector.svelte";
  import {
    FileBrowserContext,
    setFileBrowserContext,
    type FileBrowserEvents
  } from "../utils/file-browser.svelte";
  // import { playlistState, type PlaylistItem } from "../state.svelte";
  // import { PlaylistManager } from "../utils/playlist";

  let {
    fileBrowserEvents
  }: {
    fileBrowserEvents?: FileBrowserEvents;
  } = $props();

  // Create and set file browser context
  const fileBrowserContext = new FileBrowserContext();
  setFileBrowserContext(fileBrowserContext);

  // Wire up events if provided
  if (fileBrowserEvents) {
    fileBrowserEvents.addFile = fileBrowserContext.setFileInFileSystem.bind(fileBrowserContext);
    fileBrowserEvents.addFolder = fileBrowserContext.setFolderInFileSystem.bind(fileBrowserContext);
  }

  // function handlePlaylistPlay(item: PlaylistItem) {
  //   console.log("Playing:", item);
  // }
  // function handlePlaylistPlay(item: any) {}

  // function handlePlaylistRemove(id: string) {
  //   PlaylistManager.removeItemFromPlaylist(playlistState.currentPlaylistId, id);
  // }

  function handlePlaylistClear() {
    // PlaylistManager.clearPlaylist(playlistState.currentPlaylistId);
  }

  function handlePlaylistShuffle() {
    // PlaylistManager.shufflePlaylist(playlistState.currentPlaylistId);
  }

  // function handleFileSelect(filePath: string) {
  //   Handle file selection from browser
  //   console.log("File selected:", filePath);
  //   const filename = filePath.split("/").pop() || filePath;
  //   PlaylistManager.addItemToPlaylist(playlistState.currentPlaylistId, {
  //     name: filename,
  //     path: filePath
  //   });
  // }
</script>

<div class="h-full bg-zinc-900 p-4">
  <Tabs.Root value="browser" class="flex w-full flex-col">
    <Tabs.List class="grid w-full grid-cols-2 gap-0">
      <Tabs.Trigger value="browser" class="flex-1">Browser</Tabs.Trigger>
      <Tabs.Trigger value="playlist" class="flex-1">Playlist</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="browser" class="mt-4 flex-1 overflow-hidden">
      <div class="scrollbar-hide h-full overflow-y-auto">
        <FileBrowser />
      </div>
    </Tabs.Content>
    <Tabs.Content value="playlist" class="mt-4 flex-1 overflow-auto">
      <div class="space-y-2">
        <!-- Playlist Selector -->
        <PlaylistSelector />

        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-medium text-zinc-300">Current Playlist</h3>
          <div class="flex gap-1">
            <button
              class="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              onclick={handlePlaylistShuffle}
              title="Shuffle"
            >
              <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M4 7h3l3-3v2h5a1 1 0 110 2H10v2L7 7zM4 13h3l3 3v-2h5a1 1 0 110-2H10v-2l-3 3z"
                />
              </svg>
            </button>
            <button
              class="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              onclick={handlePlaylistClear}
              title="Clear All"
            >
              <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
        <div class="min-h-[200px] rounded-lg bg-zinc-800 p-3">
          <!-- {#if playlistState.currentPlaylistItems.length === 0}
            <div class="py-8 text-center text-zinc-500">
              <div class="mb-2 text-2xl">🎵</div>
              <p class="text-sm">No items in playlist</p>
              <p class="mt-1 text-xs">Drop files here or browse to add</p>
            </div>
          {:else}
            <div class="space-y-1">
              {#each playlistState.currentPlaylistItems as item, index}
                <div
                  class="group flex items-center gap-2 rounded p-2 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  <span class="w-6 text-center text-zinc-500">{index + 1}</span>
                  <button
                    class="flex-1 truncate text-left"
                    onclick={() => handlePlaylistPlay(item)}
                  >
                    {item.name}
                  </button>
                  {#if item.duration}
                    <span class="text-xs text-zinc-500">
                      {Math.floor(item.duration / 60)}:{(item.duration % 60)
                        .toString()
                        .padStart(2, "0")}
                    </span>
                  {/if}
                  <button
                    class="p-1 text-zinc-400 opacity-0 hover:text-red-400 group-hover:opacity-100"
                    onclick={() => handlePlaylistRemove(item.id)}
                  >
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              {/each}
            </div>
          {/if} -->
        </div>
      </div>
    </Tabs.Content>
  </Tabs.Root>
</div>
