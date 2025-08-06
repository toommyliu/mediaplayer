<script lang="ts">
  import * as Tooltip from "$ui/tooltip/";
  import { Button } from "$ui/button/";

  import Menu from "~icons/lucide/menu";

  import { sidebarState } from "$lib/state/sidebar.svelte";
  import { cn } from "$lib/utils";
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="ghost"
        size="icon"
        onclick={() => (sidebarState.isOpen = !sidebarState.isOpen)}
        class={cn(sidebarState.isOpen && "bg-blue-500/20 text-blue-400")}
      >
        <Menu class="size-4" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      {sidebarState.isOpen ? "Hide sidebar" : "Show sidebar"}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
