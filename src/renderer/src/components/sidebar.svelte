<script lang="ts">
  import * as Tabs from "$ui/tabs/";
  import TabFileBrowser from "$components/sidebar/file-browser/TabFileBrowser.svelte";
  import TabQueue from "$components/sidebar/tab-playlist-queue.svelte";

  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";

  import { SidebarTab } from "$/types";
  import { sidebarState } from "$lib/state/sidebar.svelte";
</script>

<div class="border-sidebar-border bg-sidebar flex h-full flex-col border-r p-4 backdrop-blur-xl">
  <Tabs.Root
    value={sidebarState.currentTab}
    class="flex h-full w-full flex-col"
    onValueChange={(value) => (sidebarState.currentTab = value as SidebarTab)}
  >
    <Tabs.List
      class="border-sidebar-border bg-sidebar-accent grid w-full grid-cols-2 gap-1 rounded-lg border p-0"
    >
      <Tabs.Trigger value={SidebarTab.FileBrowser} class="text-sidebar-foreground h-full flex-1"
        >Files</Tabs.Trigger
      >
      <Tabs.Trigger value={SidebarTab.Queue} class="text-sidebar-foreground h-full flex-1"
        >Queue</Tabs.Trigger
      >
    </Tabs.List>

    <div class="relative flex-1 overflow-hidden rounded-b-md">
      {#key sidebarState.currentTab}
        <div
          class="absolute inset-0 flex h-full w-full"
          in:fly={{
            x: sidebarState.currentTab === SidebarTab.FileBrowser ? -300 : 300,
            duration: 300,
            easing: cubicOut
          }}
          out:fly={{
            x: sidebarState.currentTab === SidebarTab.FileBrowser ? 300 : -300,
            duration: 300,
            easing: cubicOut
          }}
        >
          {#if sidebarState.currentTab === SidebarTab.FileBrowser}
            <div class="h-full w-full overflow-hidden">
              <TabFileBrowser />
            </div>
          {:else if sidebarState.currentTab === SidebarTab.Queue}
            <div class="h-full w-full overflow-hidden">
              <TabQueue />
            </div>
          {/if}
        </div>
      {/key}
    </div>
  </Tabs.Root>
</div>
