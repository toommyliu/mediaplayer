<script lang="ts">
  import * as Dialog from "@/components/ui/dialog";
  import { PlaylistManager } from "@/utils/playlist-manager";

  type Props = {
    open: boolean;
  };

  let { open = $bindable() }: Props = $props();

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
    open = false;
  }
</script>

<Dialog.Root bind:open>
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
          class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
          onkeydown={(ev) => ev.key === "Enter" && createPlaylist()}
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
          class="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
        ></textarea>
      </div>
    </div>

    <Dialog.Footer class="flex justify-end gap-2 pt-4">
      <Dialog.Close>
        <button
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
