<script lang="ts">
  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
  import { makeTimeString } from "$lib/makeTimeString";
  import { volume } from "$lib/state/volume.svelte";

  const { showOverlay }: { showOverlay: boolean } = $props();
</script>

<div
  class="bg-opacity-70 absolute top-4 left-4 rounded-lg bg-black p-3 text-white transition-opacity duration-300"
  class:opacity-100={showOverlay}
  class:opacity-0={!showOverlay}
>
  <div class="text-sm font-medium">
    {queue.currentItem?.path?.split("/").pop() ?? "Unknown"}
  </div>
  <div class="mt-1 text-xs text-gray-300">
    {makeTimeString(playerState.currentTime)} / {makeTimeString(playerState.duration)}
  </div>
  <div class="mt-1 text-xs text-gray-300">
    {playerState.isPlaying ? "Playing" : "Paused"} • Volume: {Math.round(
      volume.value * 100
    )}%{volume.isMuted ? " (Muted)" : ""}
  </div>
</div>
