<script lang="ts">
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import Plus from "lucide-svelte/icons/plus";
  import * as DropdownMenu from "@/components/ui/dropdown-menu";
  import { ICON_SIZE } from "@/constants";
  import { playlistState } from "@/state.svelte";
  import { PlaylistManager } from "@/utils/playlist-manager";
  import { cn } from "@/utils/utils";
  import CreatePlaylistDialog from "./create-playlist-dialog.svelte";

  let showCreateDialog = $state(false);

  function selectPlaylist(playlistId: string) {
    PlaylistManager.switchToPlaylist(playlistId);
  }
</script>

<div class="mb-3 flex items-center gap-2">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="h-9 flex-1 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left text-sm transition-colors hover:border-zinc-700 hover:bg-zinc-800/50 data-[state=open]:border-zinc-600 data-[state=open]:bg-zinc-800/50"
    >
      <div class="flex items-center justify-between">
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium text-zinc-200">
            {playlistState.currentPlaylist?.name ?? "No Playlist"}
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
        <div class="space-y-1">
          {#each playlistState.playlists as playlist (playlist.id)}
            <DropdownMenu.Item
              class={cn(
                "flex items-center justify-between rounded-md border px-2 py-2 text-sm transition-colors hover:bg-zinc-800 focus:bg-zinc-800",
                playlist.id === playlistState.currentPlaylistId
                  ? "border-blue-500/20 bg-blue-500/10"
                  : "border-transparent"
              )}
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
                    class={cn(
                      "truncate font-medium",
                      playlist.id === playlistState.currentPlaylistId
                        ? "text-blue-400"
                        : "text-zinc-200"
                    )}
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
            class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-zinc-800 focus:bg-zinc-800"
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
    <Plus size={ICON_SIZE - 4} />
  </button>
</div>

<!-- Create Playlist Dialog -->
<CreatePlaylistDialog bind:open={showCreateDialog} />
