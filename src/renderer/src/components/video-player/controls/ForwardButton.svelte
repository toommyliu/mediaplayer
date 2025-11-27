<script lang="ts">
  import { Button } from "$ui/button/";
  import * as Tooltip from "$ui/tooltip/";

  import IconFastForward from "~icons/tabler/player-skip-forward";  

  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        class="h-8 w-8 text-white"
        variant="ghost"
        size="icon"
        onclick={async () => playerState.playNextVideo()}
        disabled={!queue.currentItem || playerState.isLoading}
      >
        <IconFastForward class="size-4" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Next track</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
