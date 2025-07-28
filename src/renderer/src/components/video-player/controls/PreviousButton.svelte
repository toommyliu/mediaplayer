<script lang="ts">
  import { Button } from "$ui/button/";
  import * as Tooltip from "$ui/tooltip/";

  import LucideRewind from "~icons/lucide/rewind";

  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="ghost"
        size="icon"
        onclick={async () => playerState.playPrevious()}
        disabled={!queue.currentItem || playerState.isLoading}
      >
        <LucideRewind class="size-4" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Previous track</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
