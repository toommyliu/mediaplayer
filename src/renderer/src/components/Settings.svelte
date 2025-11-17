<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Settings, Play, Palette, Keyboard } from "lucide-svelte";
  import SettingsTabGeneral from "$/components/settings/SettingsTabGeneral.svelte";
  import SettingsTabKeyboardShortcuts from "$/components/settings/SettingsTabKeyboardShortcuts.svelte";
  import SettingsTabPlayback from "$/components/settings/SettingsTabPlayback.svelte";
  import SettingsTabUI from "$/components/settings/SettingsTabUI.svelte";

  import * as Dialog from "$ui/dialog";

  import { settings } from "$lib/state/settings.svelte";

  const SettingsCategory = {
    General: "general",
    Playback: "playback",
    UI: "ui",
    Shortcuts: "shortcuts"
  } as const;

  const categoryItems = [
    {
      id: SettingsCategory.General,
      label: "General"
    },
    {
      id: SettingsCategory.Playback,
      label: "Playback"
    },
    {
      id: SettingsCategory.UI,
      label: "UI"
    },
    {
      id: SettingsCategory.Shortcuts,
      label: "Keyboard Shortcuts"
    }
  ];

  let selectedTab: string = $state(SettingsCategory.General);
  let navElement: HTMLElement | null = null;

  function handleKeydown(event: KeyboardEvent) {
    if (!navElement) return;
    const currentIndex = categoryItems.findIndex(cat => cat.id === selectedTab);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        newIndex = (currentIndex + 1) % categoryItems.length;
        break;
      case 'ArrowUp':
        newIndex = currentIndex === 0 ? categoryItems.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = categoryItems.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectedTab = categoryItems[newIndex].id;
    // Focus the new tab
    const buttons = navElement.querySelectorAll('button');
    (buttons[newIndex] as HTMLElement).focus();
  }

  $effect(() => {
    if (settings.showDialog && navElement) {
      // Focus the active tab when dialog opens
      const activeButton = navElement.querySelector(`[aria-selected="true"]`) as HTMLElement;
      if (activeButton) activeButton.focus();
    }
  });
</script>

<Dialog.Root bind:open={settings.showDialog}>
  <Dialog.Content
    class="flex h-full w-full flex-col overflow-hidden p-0 md:h-[85vh] md:w-[90vw] md:max-w-6xl md:flex-row"
    showCloseButton={false}
  >
    <div class="flex flex-1 flex-col overflow-hidden md:flex-row">
      <aside class="border-sidebar-border bg-sidebar flex-shrink-0 border-b md:border-b-0 md:border-r md:w-72">
        <div class="flex h-full flex-col">
          <div class="p-4">
            <nav class="space-y-1" role="tablist" bind:this={navElement} onkeydown={handleKeydown}>
              {#each categoryItems as category (category.id)}
                <button
                  class="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 {selectedTab ===
                  category.id
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}"
                  onclick={() => (selectedTab = category.id)}
                  role="tab"
                  aria-selected={selectedTab === category.id}
                  tabindex={selectedTab === category.id ? 0 : -1}
                >
                  {#if category.id === SettingsCategory.General}
                    <Settings class="h-4 w-4" />
                  {:else if category.id === SettingsCategory.Playback}
                    <Play class="h-4 w-4" />
                  {:else if category.id === SettingsCategory.UI}
                    <Palette class="h-4 w-4" />
                  {:else if category.id === SettingsCategory.Shortcuts}
                    <Keyboard class="h-4 w-4" />
                  {/if}
                  <div class="text-sm font-medium">{category.label}</div>
                </button>
              {/each}
            </nav>
          </div>
        </div>
      </aside>

      <main class="flex-1 p-6">
        {#if selectedTab === SettingsCategory.General}
          <div transition:fade={{ duration: 200 }}>
            <SettingsTabGeneral />
          </div>
        {:else if selectedTab === SettingsCategory.Playback}
          <div transition:fade={{ duration: 200 }}>
            <SettingsTabPlayback />
          </div>
        {:else if selectedTab === SettingsCategory.UI}
          <div transition:fade={{ duration: 200 }}>
            <SettingsTabUI />
          </div>
        {:else if selectedTab === SettingsCategory.Shortcuts}
          <div transition:fade={{ duration: 200 }}>
            <SettingsTabKeyboardShortcuts />
          </div>
        {/if}
      </main>
    </div>
  </Dialog.Content>
</Dialog.Root>
