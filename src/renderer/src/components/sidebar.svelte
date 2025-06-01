<script lang="ts">
  import * as Tabs from "./ui/tabs/";
  import TabFileBrowser from "./sidebar/tab-file-browser.svelte";
  import { sidebarState } from "../state.svelte";
  import { SidebarTab } from "@/types";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  let previousTab = $state(sidebarState.currentTab);
  let isTransitioning = $state(false);

  $effect(() => {
    if (previousTab !== sidebarState.currentTab) {
      isTransitioning = true;
      previousTab = sidebarState.currentTab;

      const timeoutId = setTimeout(() => {
        isTransitioning = false;
      }, 300);

      return () => {
        clearTimeout(timeoutId);
      };
    }

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
      <Tabs.Trigger value={SidebarTab.Queue} class="flex-1">Queue</Tabs.Trigger>
    </Tabs.List>

    <!-- Tab content container with relative positioning for sliding animation -->
    <div class="relative mt-6 flex-1 overflow-hidden">
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
              <div
                class="flex h-full items-center justify-center rounded-xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm"
              >
                <div class="space-y-2 text-center">
                  <div
                    class="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800/50"
                  >
                    <svg
                      class="h-6 w-6 text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                      ></path>
                    </svg>
                  </div>
                  <p class="text-sm font-medium text-zinc-400">Playlist Coming Soon</p>
                  <p class="text-xs text-zinc-500">Feature in development</p>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/key}
    </div>
  </Tabs.Root>
</div>
