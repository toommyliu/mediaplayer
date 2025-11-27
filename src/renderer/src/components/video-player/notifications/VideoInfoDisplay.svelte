<script lang="ts">
  import { queue } from "$lib/state/queue.svelte";
  import { fade } from "svelte/transition";

  interface Props {
    visible: boolean;
  }

  let { visible }: Props = $props();
</script>

{#if visible && queue.currentItem}
  <div
    transition:fade={{ duration: 300 }}
    class="pointer-events-none absolute top-0 left-0 z-20 w-full bg-linear-to-b from-black/70 via-black/40 to-transparent p-8 pt-8 pb-16"
  >
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        {queue.currentItem.name}
      </h1>
      {#if queue.items.length > 1}
        <p class="text-sm font-medium text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          Video {queue.index + 1} of {queue.items.length}
        </p>
      {/if}
    </div>
  </div>
{/if}
