<script lang="ts">
  import { playlistState } from "../../state.svelte";
  import { PlaylistManager } from "../../utils/playlist";
  import Plus from "lucide-svelte/icons/plus";
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import * as DropdownMenu from "../ui/dropdown-menu/index";
  import * as Dialog from "../ui/dialog/index";

  let showCreateDialog = $state(false);
  let newPlaylistName = $state("");
  let newPlaylistDescription = $state("");

  function createPlaylist() {
    if (!newPlaylistName.trim()) return;

    const newPlaylist = PlaylistManager.createPlaylist(
      newPlaylistName.trim(),
      newPlaylistDescription.trim() || undefined
    );
    PlaylistManager.switchToPlaylist(newPlaylist.id);

    newPlaylistName = "";
    newPlaylistDescription = "";
    showCreateDialog = false;
  }

  function selectPlaylist(playlistId: string) {
    console.log(`[PlaylistSelector] Switching to playlist: ${playlistId}`);
    PlaylistManager.switchToPlaylist(playlistId);
    console.log(
      `[PlaylistSelector] After switch - current playlist items: ${playlistState.currentPlaylistItems.length}`
    );
  }

  $effect(() => {
    console.log(`[PlaylistSelector] Current playlist changed:`, {
      id: playlistState.currentPlaylistId,
      name: playlistState.currentPlaylist?.name,
      itemCount: playlistState.currentPlaylistItems.length,
      hasUnsavedChanges: playlistState.hasUnsavedChanges
    });
  });
</script>

<div class="mb-3 flex items-center gap-2">
  <!-- Playlist selector -->
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="flex-1 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left text-sm transition-colors hover:border-zinc-700 hover:bg-zinc-800/50 data-[state=open]:border-zinc-600 data-[state=open]:bg-zinc-800/50"
    >
      <div class="flex items-center justify-between">
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium text-zinc-200">
            {playlistState.currentPlaylist?.name || "No Playlist"}
          </div>
          <div class="text-xs text-zinc-500">
            {#if playlistState.currentPlaylistItems.length === 0}
              Empty playlist
            {:else if playlistState.currentPlaylistItems.length === 1}
              1 item
            {:else}
              {playlistState.currentPlaylistItems.length} items
            {/if}
          </div>
        </div>
        <ChevronDown
          class="h-4 w-4 shrink-0 text-zinc-400 transition-transform data-[state=open]:rotate-180"
        />
      </div>
    </DropdownMenu.Trigger>

    <DropdownMenu.Content
      class="max-h-64 min-w-[280px] overflow-y-auto border-zinc-700 bg-zinc-900 shadow-xl"
    >
      <div class="p-2">
        <div class="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Playlists</div>
        <div class="space-y-1">
          {#each playlistState.playlists as playlist}
            <DropdownMenu.Item
              class="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-zinc-800 focus:bg-zinc-800 {playlist.id ===
              playlistState.currentPlaylistId
                ? 'border border-blue-500/20 bg-blue-500/10'
                : 'border border-transparent'}"
              onclick={() => selectPlaylist(playlist.id)}
            >
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <div class="flex h-5 w-5 shrink-0 items-center justify-center">
                  {#if playlist.id === playlistState.currentPlaylistId}
                    <div class="h-2 w-2 rounded-full bg-blue-500"></div>
                  {:else}
                    <div class="h-3 w-3 rounded-full border border-zinc-600"></div>
                  {/if}
                </div>
                <div class="min-w-0 flex-1">
                  <div
                    class="truncate font-medium {playlist.id === playlistState.currentPlaylistId
                      ? 'text-blue-400'
                      : 'text-zinc-200'}"
                  >
                    {playlist.name}
                  </div>
                  {#if playlist.description}
                    <div class="truncate text-xs text-zinc-500">{playlist.description}</div>
                  {/if}
                </div>
              </div>
              <div class="shrink-0 text-xs text-zinc-500">
                {playlist.items.length}
              </div>
            </DropdownMenu.Item>
          {/each}
        </div>

        <div class="mt-3 border-t border-zinc-800 pt-2">
          <DropdownMenu.Item
            class="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-zinc-800 focus:bg-zinc-800"
            onclick={() => (showCreateDialog = true)}
          >
            <div
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-dashed border-zinc-600"
            >
              <Plus size={12} class="text-zinc-400" />
            </div>
            <span class="font-medium text-zinc-300">Create New Playlist</span>
          </DropdownMenu.Item>
        </div>
      </div>
    </DropdownMenu.Content>
  </DropdownMenu.Root>

  <!-- Quick create button -->
  <button
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50 hover:text-zinc-300"
    onclick={() => (showCreateDialog = true)}
    title="Create new playlist"
  >
    <Plus size={14} />
  </button>
</div>

<!-- Create Playlist Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
  <Dialog.Content class="border-zinc-700 bg-zinc-900 sm:max-w-md">
    <Dialog.Header class="space-y-1">
      <Dialog.Title class="text-lg font-semibold text-zinc-200">Create New Playlist</Dialog.Title>
      <Dialog.Description class="text-sm text-zinc-400">
        Create a new playlist to organize your videos.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <label for="playlist-name" class="text-sm font-medium text-zinc-300">
          Playlist Name <span class="text-red-400">*</span>
        </label>
        <input
          id="playlist-name"
          type="text"
          bind:value={newPlaylistName}
          placeholder="Enter playlist name..."
          class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onkeydown={(e) => e.key === "Enter" && createPlaylist()}
          autofocus
        />
      </div>

      <div class="space-y-2">
        <label for="playlist-description" class="text-sm font-medium text-zinc-300">
          Description
        </label>
        <textarea
          id="playlist-description"
          bind:value={newPlaylistDescription}
          placeholder="Enter description (optional)..."
          rows="3"
          class="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        ></textarea>
      </div>
    </div>

    <Dialog.Footer class="flex justify-end gap-2 pt-4">
      <Dialog.Close asChild let:builder>
        <button
          use:builder.action
          {...builder}
          class="rounded-md px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          Cancel
        </button>
      </Dialog.Close>
      <button
        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!newPlaylistName.trim()}
        onclick={createPlaylist}
      >
        Create Playlist
      </button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
