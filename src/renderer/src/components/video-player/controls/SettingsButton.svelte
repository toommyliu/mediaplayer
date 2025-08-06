<script lang="ts">
  import * as Tooltip from "$ui/tooltip/";
  import { Button } from "$ui/button/";

  import TablerSettings from "~icons/tabler/settings";

  import { settings } from "$lib/state/settings.svelte";
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="ghost"
        size="icon"
        onclick={() => (settings.showDialog = true)}
        class="h-8 w-8 rounded-full text-white transition-all duration-200 hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
      >
        <TablerSettings class="size-4" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Settings</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
