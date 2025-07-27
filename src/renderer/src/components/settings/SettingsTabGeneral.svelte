<script lang="ts">
  import ChevronDownIcon from "lucide-svelte/icons/chevron-down";
  import MoonIcon from "lucide-svelte/icons/moon";
  import SunIcon from "lucide-svelte/icons/sun";

  import * as DropdownMenu from "$ui/dropdown-menu/";
  import { Button } from "$ui/button/";
  import { Label } from "$ui/label";

  import { mode, resetMode, setMode } from "mode-watcher";

  const displayName = $derived.by(() =>
    mode.current ? mode.current.charAt(0).toUpperCase() + mode.current.slice(1) : "System"
  );
</script>

<div class="space-y-6">
  <div class="flex flex-col space-y-3">
    <div class="flex flex-col gap-2">
      <div class="flex flex-col items-start gap-2">
        <Label class="text-foreground text-base font-medium">Application Theme</Label>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="outline">
              {#if mode.current === "dark"}
                <MoonIcon class="h-4 w-4 text-blue-400" />
              {:else if mode.current === "light"}
                <SunIcon class="h-4 w-4 text-yellow-500" />
              {/if}

              <div class="flex items-center gap-2">
                <span class="text-sm">{displayName}</span>
                <ChevronDownIcon class="text-muted-foreground h-4 w-4" />
              </div>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="start">
            <DropdownMenu.Item onclick={() => setMode("light")} class="flex items-center gap-2">
              <SunIcon class="h-4 w-4 text-yellow-500" />
              Light
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => setMode("dark")} class="flex items-center gap-2">
              <MoonIcon class="h-4 w-4 text-blue-400" />
              Dark
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => resetMode()} class="flex items-center gap-2">
              System
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>
  </div>
</div>
