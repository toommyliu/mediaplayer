<script lang="ts">
  import Button from "@/components/ui/button/button.svelte";
  import { Checkbox } from "@/components/ui/checkbox";
  import * as Tabs from "@/components/ui/tabs";
  import { hotkeyRecorder, formatHotkeyDisplay } from "@/lib/hotkeys/hotkey-recorder";
  import { hotkeyConfig } from "@/utils/hotkeys.svelte";

  let editingAction = $state<string | null>(null);
  let isRecording = $state(false);
  let recordedKeys = $state<string>("");
  let originalKeys = $state<string>("");
  let seekTime = $state(hotkeyConfig.isInitialized ? hotkeyConfig.seekTime : 10);
  let volumeStep = $state(hotkeyConfig.isInitialized ? hotkeyConfig.volumeStep * 100 : 10);
  let hasUnsavedChanges = $state(false);
  let activeTab = $state<string>("");

  const shortcuts = $derived(hotkeyConfig.getAllShortcuts());

  // Group shortcuts by category
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

  // Get list of categories for tabs
  const categories = $derived(() => Array.from(shortcutsByCategory().keys()));

  // Set initial active tab when categories change
  $effect(() => {
    if (categories().length > 0 && !activeTab) {
      activeTab = categories()[0];
    }
  });

  function closeDialog(): void {
    if (hasUnsavedChanges) {
      const shouldClose = confirm("You have unsaved changes. Are you sure you want to close?");
      if (!shouldClose) return;
    }

    if (hotkeyConfig.isInitialized) {
      hotkeyConfig.bindAllActions();
    }
    cancelEdit();
  }

  function startEditingHotkey(actionId: string, currentKeys: string): void {
    // Cancel any existing edit first
    if (editingAction) {
      cancelEdit();
    }

    editingAction = actionId;
    originalKeys = currentKeys;
    recordedKeys = "";
    hasUnsavedChanges = false;
    isRecording = true;
    hotkeyRecorder.startRecording(
      (result) => {
        recordedKeys = formatHotkeyDisplay(result.keys);
        isRecording = false;
        hasUnsavedChanges = recordedKeys !== originalKeys;
        // Do NOT start a new recording session automatically
      },
      () => {
        isRecording = false;
      }
    );
  }

  function startRecording(): void {
    if (!editingAction) return;
    isRecording = true;
    hotkeyRecorder.startRecording(
      (result) => {
        recordedKeys = formatHotkeyDisplay(result.keys);
        isRecording = false;
        hasUnsavedChanges = recordedKeys !== originalKeys;
      },
      () => {
        isRecording = false;
      }
    );
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!editingAction) return;

    // Escape cancels the current edit
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }

    // Enter saves (if not currently recording)
    if (event.key === "Enter" && !isRecording) {
      event.preventDefault();
      if (recordedKeys && recordedKeys !== originalKeys) {
        saveHotkey();
      }

      return;
    }

    // Ctrl/Cmd + S saves
    if (
      !isRecording &&
      event.key === "s" &&
      (event.metaKey || event.ctrlKey) &&
      recordedKeys &&
      recordedKeys !== originalKeys
    ) {
      event.preventDefault();
      saveHotkey();
    }
  }

  function saveHotkey(): void {
    if (editingAction && recordedKeys.trim() && hotkeyConfig.isInitialized) {
      // Removed auto-save timeout clearing
      const keys = recordedKeys
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      hotkeyConfig.updateHotkey(editingAction, keys);

      // Reset editing state
      editingAction = null;
      recordedKeys = "";
      originalKeys = "";
      hasUnsavedChanges = false;
      hotkeyRecorder.cancelRecording();
    }
  }

  function cancelEdit(): void {
    // Removed auto-save timeout clearing
    editingAction = null;
    recordedKeys = "";
    originalKeys = "";
    hasUnsavedChanges = false;
    isRecording = false;
    hotkeyRecorder.cancelRecording();
  }

  function toggleActionEnabled(actionId: string, enabled: boolean): void {
    if (!hotkeyConfig.isInitialized) return;
    hotkeyConfig.toggleAction(actionId, enabled);
  }

  function updateSeekTime(): void {
    if (!hotkeyConfig.isInitialized) return;
    hotkeyConfig.updateSeekTime(seekTime);
  }

  function updateVolumeStep(): void {
    if (!hotkeyConfig.isInitialized) return;
    hotkeyConfig.updateVolumeStep(volumeStep / 100);
  }

  function resetToDefaults(): void {
    const shouldReset = confirm("This will reset all hotkeys to their default values. Continue?");
    if (!shouldReset) return;

    if (!hotkeyConfig.isInitialized) {
      console.warn("Hotkeys not initialized yet");
      return;
    }

    hotkeyConfig.disable();
    hotkeyConfig.seekTime = 10;
    hotkeyConfig.volumeStep = 0.1;
    hotkeyConfig.enable();
    seekTime = hotkeyConfig.seekTime;
    volumeStep = hotkeyConfig.volumeStep * 100;

    // Cancel any current edits
    cancelEdit();
  }
</script>

<div class="flex h-full flex-col space-y-8">
  <div class="flex-shrink-0 space-y-4">
    <!-- Global Settings -->
    <div class="border-border bg-muted grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2">
      <div class="space-y-2">
        <label class="text-foreground text-sm font-medium"> Seek Time (seconds) </label>
        <input
          type="number"
          bind:value={seekTime}
          onchange={updateSeekTime}
          min="1"
          max="60"
          class="border-input bg-background text-foreground focus:border-ring focus:ring-ring/20 w-full rounded-md border px-3 py-2 text-sm focus:ring-2"
        />
      </div>
      <div class="space-y-2">
        <label class="text-foreground text-sm font-medium"> Volume Step (%) </label>
        <input
          type="number"
          bind:value={volumeStep}
          onchange={updateVolumeStep}
          min="1"
          max="50"
          class="border-input bg-background text-foreground focus:border-ring focus:ring-ring/20 w-full rounded-md border px-3 py-2 text-sm focus:ring-2"
        />
      </div>
    </div>
  </div>

  <div class="flex h-full min-h-0 flex-col space-y-6">
    <Tabs.Root bind:value={activeTab} class="flex h-full flex-col">
      <Tabs.List
        class="bg-muted grid w-full rounded-lg p-0"
        style="grid-template-columns: repeat({categories().length}, minmax(0, 1fr));"
      >
        {#each categories() as category (category)}
          <Tabs.Trigger
            value={category}
            class="data-[state=active]:bg-background rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:shadow-sm"
          >
            {category}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>

      {#each categories() as category (category)}
        <Tabs.Content value={category} class="mt-6 flex-1 overflow-hidden">
          <div class="border-border bg-card flex h-full flex-col rounded-lg border shadow-sm">
            <div class="no-scrollbar flex-1 overflow-y-auto">
              <table class="w-full">
                <thead class="border-border bg-muted sticky top-0 border-b">
                  <tr>
                    <th class="text-foreground w-1/3 px-6 py-4 text-left text-sm font-semibold">
                      Action
                    </th>
                    <th class="text-foreground w-1/4 px-6 py-4 text-left text-sm font-semibold">
                      Shortcut
                    </th>
                    <th class="text-foreground w-1/6 px-6 py-4 text-left text-sm font-semibold">
                      Context
                    </th>
                    <th class="text-foreground w-1/12 px-6 py-4 text-center text-sm font-semibold">
                      Enabled
                    </th>
                    <th class="text-foreground w-1/6 px-6 py-4 text-center text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-border divide-y">
                  {#each shortcutsByCategory().get(category) || [] as shortcut (shortcut.id)}
                    <tr class="hover:bg-muted transition-colors">
                      <td class="text-foreground px-6 py-4 text-sm">
                        <div class="font-medium">{shortcut.description}</div>
                      </td>
                      <td class="px-6 py-4 text-sm">
                        {#if editingAction === shortcut.id}
                          <div class="space-y-3">
                            <!-- Recording Status -->
                            <div class="flex items-center gap-2">
                              {#if isRecording}
                                <div class="text-destructive flex items-center gap-2">
                                  <div
                                    class="bg-destructive h-2 w-2 animate-pulse rounded-full"
                                  ></div>
                                  <span class="text-xs font-medium">Recording...</span>
                                </div>
                              {:else if recordedKeys}
                                <div
                                  class="flex items-center gap-2 text-green-600 dark:text-green-400"
                                >
                                  <div class="h-2 w-2 rounded-full bg-green-500"></div>
                                  <span class="text-xs font-medium">Captured</span>
                                </div>
                              {/if}
                            </div>

                            <!-- Key Display -->
                            <div class="flex items-center gap-2">
                              <div
                                class="flex min-h-[2.5rem] flex-1 items-center rounded-md border px-3 py-2 font-mono text-sm
                                  {isRecording
                                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                  : recordedKeys && recordedKeys !== originalKeys
                                    ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300'
                                    : 'border-border bg-muted text-muted-foreground'}"
                              >
                                {#if isRecording}
                                  <span class="text-muted-foreground italic"
                                    >Press your key combination...</span
                                  >
                                {:else if recordedKeys}
                                  {recordedKeys}
                                {:else}
                                  {originalKeys}
                                {/if}
                              </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="flex items-center gap-2">
                              {#if isRecording}
                                <Button onclick={cancelEdit} size="sm" variant="destructive">
                                  Cancel
                                </Button>
                              {:else}
                                <Button onclick={startRecording} size="sm" variant="outline">
                                  {recordedKeys ? "Record New" : "Record"}
                                </Button>
                                {#if recordedKeys && recordedKeys !== originalKeys}
                                  <Button onclick={saveHotkey} size="sm" variant="default">
                                    Save
                                  </Button>
                                {/if}
                                <Button onclick={cancelEdit} size="sm" variant="ghost">
                                  Cancel
                                </Button>
                              {/if}
                            </div>

                            {#if (recordedKeys && recordedKeys !== originalKeys) || hasUnsavedChanges}
                              <div
                                class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-600 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                              >
                                <div class="flex items-center gap-2">
                                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fill-rule="evenodd"
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                      clip-rule="evenodd"
                                    />
                                  </svg>
                                  <span
                                    >Make sure to save your changes to apply the new shortcut.</span
                                  >
                                </div>
                              </div>
                            {/if}
                          </div>
                        {:else}
                          <div class="flex items-center gap-2">
                            <code
                              class="bg-muted text-foreground rounded-md px-3 py-2 font-mono text-sm"
                            >
                              {shortcut.keys}
                            </code>
                          </div>
                        {/if}
                      </td>
                      <td class="text-muted-foreground px-6 py-4 text-sm">
                        <span
                          class="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                        >
                          {shortcut.context || "global"}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-center">
                        <Checkbox
                          checked={shortcut.enabled}
                          class="border-border text-primary focus:ring-ring h-4 w-4 rounded"
                          onchange={() => toggleActionEnabled(shortcut.id, !shortcut.enabled)}
                        />
                      </td>
                      <td class="px-6 py-4 text-center">
                        <Button
                          onclick={() => startEditingHotkey(shortcut.id, shortcut.keys)}
                          size="sm"
                          variant="outline"
                          disabled={editingAction !== null}
                        >
                          {editingAction === shortcut.id ? "Editing..." : "Edit"}
                        </Button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Content>
      {/each}
    </Tabs.Root>
  </div>
</div>

<style>
  table {
    border-collapse: collapse;
  }
</style>
