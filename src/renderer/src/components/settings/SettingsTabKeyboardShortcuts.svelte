<script lang="ts">
  import { formatHotkeyDisplay, hotkeyRecorder } from "$lib/hotkeys/hotkey-recorder";
  import { hotkeyConfig } from "$lib/hotkeys.svelte";
  import { Kbd } from "$ui/kbd";
  import { Input } from "$ui/input";

  import LucideX from "~icons/lucide/x";
  import LucideCirclePlus from "~icons/lucide/circle-plus";
  import LucideRotateCcw from "~icons/lucide/rotate-ccw";

  let editingAction = $state<string | null>(null);
  let isRecording = $state(false);
  let searchTerm = $state("");

  const shortcuts = $derived(hotkeyConfig.getAllShortcuts());

  const filteredShortcuts = $derived(() => {
    const filtered = shortcuts;
    if (!searchTerm) return filtered;
    return filtered.filter(
      (s) =>
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatHotkeyDisplay(s.keys).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const shortcutsByCategory = $derived(() => {
    const grouped = new Map<string, ReturnType<typeof filteredShortcuts>>();
    for (const shortcut of filteredShortcuts()) {
      if (!grouped.has(shortcut.category)) {
        grouped.set(shortcut.category, []);
      }

      grouped.get(shortcut.category)!.push(shortcut);
    }

    return grouped;
  });

  const categories = $derived(() => Array.from(shortcutsByCategory().keys()));

  function startEditingHotkey(actionId: string): void {
    if (editingAction) {
      cancelEdit();
    }

    editingAction = actionId;
    isRecording = true;
    hotkeyRecorder.startRecording(
      (result) => {
        if (hotkeyConfig.isInitialized) {
          if (result.keys.length === 0) {
            hotkeyConfig.updateHotkey(actionId, []);
          } else {
            hotkeyConfig.updateHotkey(actionId, result.keys);
          }
        }

        editingAction = null;
        isRecording = false;
      },
      () => {
        editingAction = null;
        isRecording = false;
      }
    );
  }

  function cancelEdit(): void {
    editingAction = null;
    isRecording = false;
    hotkeyRecorder.cancelRecording();
  }

  function resetToDefaults(): void {
    hotkeyConfig.resetToDefaults();
  }
</script>

<div class="no-scrollbar flex h-full flex-1 flex-col space-y-1 overflow-y-auto">
  <div class="mb-4 flex items-center justify-between">
    <Input bind:value={searchTerm} placeholder="Search shortcuts..." class="mr-4 flex-1" />
    <button
      class="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      onclick={resetToDefaults}
    >
      <LucideRotateCcw class="mr-2 size-4" />
      Reset to Defaults
    </button>
  </div>
  {#each categories() as category (category)}
    <div class="mt-4 mb-1 first:mt-0">
      <h2 class="text-lg font-bold">{category}</h2>
    </div>
    <div class="bg-card flex flex-col rounded-md border shadow-sm">
      <div>
        {#each shortcutsByCategory().get(category)! as shortcut (shortcut.id)}
          <div
            class="border-border flex h-12 flex-row items-center justify-between border-b p-2 last:border-0"
          >
            <div class="text-muted-foreground flex-1 p-2 text-sm">
              {shortcut.description}
            </div>
            <div class="flex items-center gap-1">
              <Kbd class="h-7 text-xs" variant="secondary">
                {#if isRecording && editingAction === shortcut.id}
                  Press hotkey...
                {:else}
                  {shortcut.keys === "" ? "None" : formatHotkeyDisplay(shortcut.keys)}
                {/if}
              </Kbd>
              {#if isRecording && editingAction === shortcut.id}
                <button
                  class="ring-offset-background focus-visible:ring-ring bg-destructive text-destructive-foreground hover:bg-destructive/90 ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  onclick={cancelEdit}
                >
                  <span class="sr-only">Cancel Recording</span>
                  <LucideX class="size-3" />
                </button>
              {:else}
                <button
                  class="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  onclick={() => startEditingHotkey(shortcut.id)}
                  disabled={shortcut.configurable === false}
                >
                  <span class="sr-only">Edit</span>
                  <LucideCirclePlus class="size-3" />
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
