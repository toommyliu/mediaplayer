<script lang="ts">
  import { Button } from "$ui/button/";
  import * as Tooltip from "$ui/tooltip/";

  import TablerPlay from "~icons/tabler/play";
  import TablerPause from "~icons/tabler/pause";

  import { playerState } from "$lib/state/player.svelte";
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button variant="ghost" size="icon" onclick={async () => playerState.togglePlayPause()}>
        {#key playerState.isPlaying}
          {#if playerState.isPlaying}
            <TablerPause class="h-4 w-4" />
          {:else}
            <TablerPlay class="h-4 w-4" />
          {/if}
        {/key}
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>{playerState.isPlaying ? "Pause" : "Play"}</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
