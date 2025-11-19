<script lang="ts">
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

  function selectTab(id: string) {
    const newIndex = categoryItems.findIndex(cat => cat.id === id);
    selectedTab = id;
    if (navElement) {
      const buttons = navElement.querySelectorAll('button');
      (buttons[newIndex] as HTMLElement)?.focus();
    }
  }

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
    // Use selectTab to update prev index, selected tab and focus
    selectTab(categoryItems[newIndex].id);
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
    class="flex h-full w-full flex-col overflow-hidden p-0 md:h-[85vh] md:w-[90vw] md:max-w-5xl md:flex-row bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl"
    showCloseButton={false}
  >
    <div class="flex flex-1 flex-col overflow-hidden md:flex-row min-h-0">
      <aside class="bg-sidebar/50 backdrop-blur-xl flex-shrink-0 border-b border-sidebar-border md:border-b-0 md:border-r md:w-64">
        <div class="flex h-full flex-col">
          <div class="p-4 pt-6">
            <h2 class="mb-4 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</h2>
            <nav class="space-y-1" role="tablist" bind:this={navElement} onkeydown={handleKeydown}>
              {#each categoryItems as category (category.id)}
                <button
                  class="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all duration-200 {selectedTab ===
                  category.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
                  onclick={() => selectTab(category.id)}
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
                  <div class="font-medium">{category.label}</div>
                </button>
              {/each}
            </nav>
          </div>
        </div>
      </aside>

      <main class="flex-1 min-h-0 overflow-y-auto bg-background">
        <div class="h-full w-full p-6 md:p-8">
          {#key selectedTab}
            <div class="space-y-6">
                {#if selectedTab === SettingsCategory.General}
                  <SettingsTabGeneral />
                {:else if selectedTab === SettingsCategory.Playback}
                  <SettingsTabPlayback />
                {:else if selectedTab === SettingsCategory.UI}
                  <SettingsTabUI />
                {:else if selectedTab === SettingsCategory.Shortcuts}
                  <SettingsTabKeyboardShortcuts />
                {/if}
            </div>
          {/key}
        </div>
      </main>
    </div>
  </Dialog.Content>
</Dialog.Root>
