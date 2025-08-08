<script lang="ts">
  import { Button } from "$ui/button/";
  import * as Tooltip from "$ui/tooltip/";

  import LucideFastForward from "~icons/lucide/fast-forward";

  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="ghost"
        size="icon"
        onclick={async () => playerState.playNextVideo()}
        disabled={!queue.currentItem || playerState.isLoading}
      >
        <LucideFastForward class="size-4" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Next track</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
