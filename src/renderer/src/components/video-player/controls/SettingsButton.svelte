<script lang="ts">
  import * as Tooltip from "$ui/tooltip/";
  import { Button } from "$ui/button/";

  import LucideSettings from "~icons/lucide/settings";

  import { settings } from "$lib/state/settings.svelte";
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        class="h-8 w-8 text-white"
        variant="ghost"
        size="icon"
        onclick={() => (settings.showDialog = true)}
      >
        <LucideSettings class="size-4" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Settings</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
