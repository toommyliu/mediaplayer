<script lang="ts">
  import * as Tabs from "./ui/tabs/";
  import TabFileBrowser from "./sidebar/tab-file-browser.svelte";
  import TabPlaylistQueue from "./sidebar/tab-playlist-queue.svelte";
  import { sidebarState } from "../state.svelte";
  import { SidebarTab } from "@/types";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  let previousTab = $state(sidebarState.currentTab);

  $effect(() => {
    if (previousTab !== sidebarState.currentTab) previousTab = sidebarState.currentTab;
    return () => {};
  });
</script>

<div class="flex h-full flex-col border-r border-zinc-800/50 bg-zinc-900 p-4 pb-6 backdrop-blur-xl">
  <Tabs.Root
    value={sidebarState.currentTab}
    class="flex h-full w-full flex-col"
    onValueChange={(value) => (sidebarState.currentTab = value as SidebarTab)}
  >
    <Tabs.List
      class="grid w-full grid-cols-2 gap-1 rounded-lg border border-zinc-800/50 bg-zinc-900/50"
    >
      <Tabs.Trigger value={SidebarTab.FileBrowser} class="flex-1">File Browser</Tabs.Trigger>
      <Tabs.Trigger value={SidebarTab.Queue} class="flex-1">Playlist</Tabs.Trigger>
    </Tabs.List>

    <div class="relative mt-5 flex-1 overflow-hidden">
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
              <TabPlaylistQueue />
            </div>
          {/if}
        </div>
      {/key}
    </div>
  </Tabs.Root>
</div>
