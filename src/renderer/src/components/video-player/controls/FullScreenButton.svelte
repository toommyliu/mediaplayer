<script lang="ts">
  import * as Tooltip from "$ui/tooltip/";
  import { Button } from "$ui/button/";

  import Maximize from "~icons/tabler/maximize";
  import Minimize from "~icons/tabler/minimize";

  import { playerState } from "$lib/state/player.svelte";

  import { client } from "$/tipc";

  $effect(() => {
    if (playerState.isFullscreen) {
      void client.enterFullscreen();
    } else {
      void client.exitFullscreen();
    }
  });

  function toggleFullscreen() {
    playerState.isFullscreen = !playerState.isFullscreen;
  }
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button class="h-8 w-8 text-white" variant="ghost" size="icon" onclick={toggleFullscreen}>
        {#if playerState.isFullscreen}
          <Minimize class="size-4" />
        {:else}
          <Maximize class="size-4" />
        {/if}
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Fullscreen</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
