<script lang="ts">
  import { formatHotkeyDisplay, hotkeyRecorder } from "$lib/hotkeys/hotkey-recorder";
  import { hotkeyConfig } from "$lib/hotkeys.svelte";
  import { Kbd } from "$ui/kbd";

  import LucideX from "~icons/lucide/x";
  import LucideCirclePlus from "~icons/lucide/circle-plus";

  let editingAction = $state<string | null>(null);
  let isRecording = $state(false);

  const shortcuts = $derived(hotkeyConfig.getAllShortcuts());

  const shortcutsByCategory = $derived(() => {
    const grouped = new Map<string, typeof shortcuts>();
    for (const shortcut of shortcuts) {
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
</script>

<div class="no-scrollbar flex h-full flex-1 flex-col space-y-1 overflow-y-auto">
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
