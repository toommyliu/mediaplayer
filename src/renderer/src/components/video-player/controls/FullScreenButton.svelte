<script lang="ts">
  import * as Tooltip from "$ui/tooltip/";
  import { Button } from "$ui/button/";

  import Maximize from "~icons/lucide/maximize";
  import Minimize from "~icons/lucide/minimize";

  import { playerState } from "$lib/state/player.svelte";

  import { client } from "$/tipc";

  function toggleFullscreen() {
    if (playerState.isFullscreen) void client.exitFullscreen();
    else void client.enterFullscreen();

    playerState.isFullscreen = !playerState.isFullscreen;
  }
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="ghost"
        size="icon"
        onclick={toggleFullscreen}
        class="h-8 w-8 rounded-full text-white transition-all duration-200 hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
        aria-label={playerState.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
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
