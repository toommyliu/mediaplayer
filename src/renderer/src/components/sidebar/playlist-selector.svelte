<script lang="ts">
  import { playlistState } from "@/state.svelte";
  import { PlaylistManager } from "@/utils/playlist";
  import { Plus, MoreHorizontal, Copy, Trash2, Edit3, ChevronDown } from "lucide-svelte";
  import { ICON_SIZE } from "@/constants";
  import * as DropdownMenu from "../ui/dropdown-menu/index";
  import * as Dialog from "../ui/dialog/index";

  let showCreateDialog = $state(false);
  let showManageDialog = $state(false);
  let newPlaylistName = $state("");
  let newPlaylistDescription = $state("");
  let editingPlaylist: string | null = $state(null);
  let editingName = $state("");

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
    PlaylistManager.switchToPlaylist(playlistId);
  }

  function deletePlaylist(playlistId: string) {
    if (confirm("Are you sure you want to delete this playlist?")) {
      PlaylistManager.deletePlaylist(playlistId);
    }
  }

  function duplicatePlaylist(playlistId: string) {
    PlaylistManager.duplicatePlaylist(playlistId);
  }

  function startEditingPlaylist(playlistId: string, currentName: string) {
    editingPlaylist = playlistId;
    editingName = currentName;
  }

  function savePlaylistEdit() {
    if (editingPlaylist && editingName.trim()) {
      PlaylistManager.renamePlaylist(editingPlaylist, editingName.trim());
    }
    editingPlaylist = null;
    editingName = "";
  }

  function cancelEdit() {
    editingPlaylist = null;
    editingName = "";
  }
</script>

<div class="mb-3 flex items-center gap-2">
  <!-- Playlist selector -->
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-700 data-[state=open]:bg-zinc-700"
    >
      <div class="flex items-center justify-between">
        <div>
          <div class="font-medium text-zinc-200">
            {playlistState.currentPlaylist?.name || "No Playlist"}
          </div>
          <div class="text-xs text-zinc-500">
            {playlistState.currentPlaylistItems.length} items
          </div>
        </div>
        <ChevronDown class="h-4 w-4 text-zinc-400" />
      </div>
    </DropdownMenu.Trigger>

    <DropdownMenu.Content
      class="max-h-60 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto border-zinc-700 bg-zinc-800"
    >
      {#each playlistState.playlists as playlist}
        <DropdownMenu.Item
          class="px-3 py-2 text-left transition-colors hover:bg-zinc-700 focus:bg-zinc-700 {playlist.id ===
          playlistState.currentPlaylistId
            ? 'bg-zinc-700 text-blue-400'
            : 'text-zinc-300'}"
          on:click={() => selectPlaylist(playlist.id)}
        >
          <div class="font-medium">{playlist.name}</div>
          <div class="text-xs text-zinc-500">{playlist.items.length} items</div>
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>

  <button
    class="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700"
    onclick={() => (showCreateDialog = true)}
    title="Create new playlist"
  >
    <Plus size={ICON_SIZE - 2} />
  </button>

  <button
    class="rounded-lg bg-zinc-800 p-2 text-zinc-300 transition-colors hover:bg-zinc-700"
    onclick={() => (showManageDialog = true)}
    title="Manage playlists"
  >
    <MoreHorizontal size={ICON_SIZE - 2} />
  </button>
</div>

<!-- Create Playlist Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
  <Dialog.Content class="border-zinc-700 bg-zinc-900 sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="text-zinc-200">Create New Playlist</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-4">
      <div>
        <label class="mb-2 block text-sm font-medium text-zinc-300">Playlist Name</label>
        <input
          type="text"
          bind:value={newPlaylistName}
          placeholder="Enter playlist name..."
          class="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          onkeydown={(e) => e.key === "Enter" && createPlaylist()}
        />
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-zinc-300">Description (optional)</label>
        <textarea
          bind:value={newPlaylistDescription}
          placeholder="Enter description..."
          rows="3"
          class="w-full resize-none rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        ></textarea>
      </div>
    </div>

    <Dialog.Footer class="flex justify-end gap-2">
      <Dialog.Close asChild let:builder>
        <button
          use:builder.action
          {...builder}
          class="px-4 py-2 text-zinc-400 transition-colors hover:text-zinc-200"
        >
          Cancel
        </button>
      </Dialog.Close>
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        disabled={!newPlaylistName.trim()}
        onclick={createPlaylist}
      >
        Create
      </button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Manage Playlists Dialog -->
<Dialog.Root bind:open={showManageDialog}>
  <Dialog.Content class="max-h-[80vh] border-zinc-700 bg-zinc-900 sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title class="text-zinc-200">Manage Playlists</Dialog.Title>
    </Dialog.Header>

    <div class="max-h-[60vh] flex-1 space-y-2 overflow-y-auto">
      {#each playlistState.playlists as playlist}
        <div class="flex items-center justify-between rounded-lg bg-zinc-800 p-3">
          <div class="flex-1">
            {#if editingPlaylist === playlist.id}
              <input
                type="text"
                bind:value={editingName}
                class="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-sm text-zinc-200"
                onkeydown={(e) => {
                  if (e.key === "Enter") savePlaylistEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                onblur={savePlaylistEdit}
              />
            {:else}
              <div class="font-medium text-zinc-200">{playlist.name}</div>
              <div class="text-xs text-zinc-500">
                {playlist.items.length} items • Created {playlist.createdAt.toLocaleDateString()}
              </div>
            {/if}
          </div>

          {#if editingPlaylist !== playlist.id}
            <div class="flex gap-1">
              <button
                class="rounded p-1 text-zinc-400 hover:text-zinc-200"
                onclick={() => startEditingPlaylist(playlist.id, playlist.name)}
                title="Rename"
              >
                <Edit3 size={14} />
              </button>
              <button
                class="rounded p-1 text-zinc-400 hover:text-zinc-200"
                onclick={() => duplicatePlaylist(playlist.id)}
                title="Duplicate"
              >
                <Copy size={14} />
              </button>
              {#if playlist.id !== "default"}
                <button
                  class="rounded p-1 text-zinc-400 hover:text-red-400"
                  onclick={() => deletePlaylist(playlist.id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <Dialog.Footer class="flex justify-end">
      <Dialog.Close asChild let:builder>
        <button
          use:builder.action
          {...builder}
          class="rounded-lg bg-zinc-700 px-4 py-2 text-zinc-200 transition-colors hover:bg-zinc-600"
        >
          Done
        </button>
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
