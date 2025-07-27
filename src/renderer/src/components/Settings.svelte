<script lang="ts">
  import SettingsTabGeneral from "$/components/settings/SettingsTabGeneral.svelte";
  import SettingsKeyboardShortcuts from "$/components/settings/SettingsTabKeyboardShortcuts.svelte";
  import * as Dialog from "$ui/dialog";

  let { open: isOpen = $bindable() }: { open: boolean } = $props();

  const SettingsCategory = {
    General: "general",
    Shortcuts: "shortcuts"
  } as const;

  const categoryItems = [
    {
      id: SettingsCategory.General,
      label: "General"
    },
    {
      id: SettingsCategory.Shortcuts,
      label: "Keyboard Shortcuts"
    }
  ];

  let selectedTab: string = $state(SettingsCategory.General);
</script>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Content
    class="flex h-[85vh] w-[90vw] max-w-6xl flex-col overflow-hidden p-0 sm:max-w-none"
    showCloseButton={false}
  >
    <div class="flex flex-1 overflow-hidden">
      <aside class="border-sidebar-border bg-sidebar w-72 flex-shrink-0 border-r">
        <div class="flex h-full flex-col">
          <div class="p-4">
            <nav class="space-y-1">
              {#each categoryItems as category (category.id)}
                <button
                  class="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 {selectedTab ===
                  category.id
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}"
                  onclick={() => (selectedTab = category.id)}
                >
                  <div class="text-sm font-medium">{category.label}</div>
                </button>
              {/each}
            </nav>
          </div>
        </div>
      </aside>

      <main class="flex-1 p-6">
        {#if selectedTab === SettingsCategory.General}
          <SettingsTabGeneral />
        {:else if selectedTab === SettingsCategory.Shortcuts}
          <SettingsKeyboardShortcuts />
        {/if}
      </main>
    </div>
  </Dialog.Content>
</Dialog.Root>
