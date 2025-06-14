<script lang="ts">
  import { hotkeyConfig } from "@/utils/hotkeys.svelte";
  import { hotkeyRecorder, formatHotkeyDisplay } from "@/utils/hotkey-recorder";
  import Button from "@/components/ui/button/button.svelte";
  import * as Dialog from "@/components/ui/dialog";
  import * as Tabs from "@/components/ui/tabs";

  let isOpen = $state(false);
  let editingAction = $state<string | null>(null);
  let isRecording = $state(false);
  let recordedKeys = $state<string>("");
  let originalKeys = $state<string>("");
  let seekTime = $state(hotkeyConfig.seekTime);
  let volumeStep = $state(hotkeyConfig.volumeStep * 100);
  let hasUnsavedChanges = $state(false);
  let activeTab = $state<string>("");

  const shortcuts = $derived(hotkeyConfig.getAllShortcuts());

  // Group shortcuts by category
  const shortcutsByCategory = $derived(() => {
    const grouped = new Map<string, typeof shortcuts>();
    shortcuts.forEach((shortcut) => {
      if (!grouped.has(shortcut.category)) {
        grouped.set(shortcut.category, []);
      }
      grouped.get(shortcut.category)!.push(shortcut);
    });
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

  function openDialog(): void {
    isOpen = true;
  }

  function closeDialog(): void {
    if (hasUnsavedChanges) {
      const shouldClose = confirm("You have unsaved changes. Are you sure you want to close?");
      if (!shouldClose) return;
    }

    isOpen = false;
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
    if (!isRecording && event.key === "s" && (event.metaKey || event.ctrlKey)) {
      if (recordedKeys && recordedKeys !== originalKeys) {
        event.preventDefault();
        saveHotkey();
      }
    }
  }

  // Add event listener when dialog opens
  $effect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeydown);
      return () => {
        document.removeEventListener("keydown", handleKeydown);
      };
    }
    return () => {}; // Return empty function for other paths
  });

  function saveHotkey(): void {
    if (editingAction && recordedKeys.trim()) {
      // Removed auto-save timeout clearing
      const keys = recordedKeys
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);

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
    hotkeyConfig.toggleAction(actionId, enabled);
  }

  function updateSeekTime(): void {
    hotkeyConfig.updateSeekTime(seekTime);
  }

  function updateVolumeStep(): void {
    hotkeyConfig.updateVolumeStep(volumeStep / 100);
  }

  function resetToDefaults(): void {
    const shouldReset = confirm("This will reset all hotkeys to their default values. Continue?");
    if (!shouldReset) return;

    hotkeyConfig.disable();
    hotkeyConfig.seekTime = 10;
    hotkeyConfig.volumeStep = 0.1;
    hotkeyConfig.enable();
    seekTime = hotkeyConfig.seekTime;
    volumeStep = hotkeyConfig.volumeStep * 100;

    // Cancel any current edits
    cancelEdit();
  }

  function exportConfig(): void {
    const config = hotkeyConfig.exportConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mediaplayer-hotkeys.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importConfig(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const config = JSON.parse(e.target?.result as string);
            hotkeyConfig.importConfig(config);
            seekTime = hotkeyConfig.seekTime;
            volumeStep = hotkeyConfig.volumeStep * 100;
            cancelEdit(); // Cancel any current edits
          } catch (err) {
            console.error("Failed to import config:", err);
            alert("Failed to import configuration. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }
</script>

<Button onclick={openDialog} variant="outline">Keyboard Shortcuts</Button>

<Dialog.Root
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) {
      hotkeyConfig.unbindAll();
      hotkeyConfig.bindAllActions();
    }
  }}
>
  <Dialog.Content
    class="no-scrollbar max-h-[80vh] max-w-none min-w-[75vw] overflow-y-auto backdrop-blur-md"
  >
    <Dialog.Header>
      <Dialog.Title>Keyboard Shortcuts</Dialog.Title>
      <Dialog.Description>
        Configure keyboard shortcuts and hotkey settings.
        {#if editingAction}
          <span class="text-amber-600">Press Escape to cancel, Enter to save.</span>
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6">
      <!-- Settings -->
      <div class="space-y-4 rounded-lg border p-4">
        <h3 class="text-lg font-semibold">Settings</h3>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="seek-time" class="mb-2 block text-sm font-medium">
              Seek Time (seconds)
            </label>
            <input
              type="number"
              id="seek-time"
              bind:value={seekTime}
              onchange={updateSeekTime}
              min="1"
              max="60"
              class="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label for="volume-step" class="mb-2 block text-sm font-medium">
              Volume Step (%)
            </label>
            <input
              type="number"
              id="volume-step"
              bind:value={volumeStep}
              onchange={updateVolumeStep}
              min="1"
              max="50"
              class="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Shortcuts Tables with Tabs -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">Keyboard Shortcuts</h3>

        <Tabs.Root bind:value={activeTab}>
          <Tabs.List
            class="grid w-full"
            style="grid-template-columns: repeat({categories().length}, minmax(0, 1fr));"
          >
            {#each categories() as category (category)}
              <Tabs.Trigger value={category} class="text-sm">
                {category}
              </Tabs.Trigger>
            {/each}
          </Tabs.List>

          {#each categories() as category (category)}
            <Tabs.Content value={category} class="mt-4">
              <div class="no-scrollbar h-96 overflow-y-auto">
                <div class="overflow-hidden rounded-lg border">
                  <table class="w-full">
                    <thead class="sticky top-0 bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th
                          class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100"
                          >Action</th
                        >
                        <th
                          class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100"
                          >Shortcut</th
                        >
                        <th
                          class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100"
                          >Context</th
                        >
                        <th
                          class="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100"
                          >Enabled</th
                        >
                        <th
                          class="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100"
                          >Actions</th
                        >
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                      {#each shortcutsByCategory().get(category) || [] as shortcut (shortcut.id)}
                        <tr class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {shortcut.description}
                          </td>
                          <td class="px-4 py-3 text-sm">
                            {#if editingAction === shortcut.id}
                              <div class="space-y-3">
                                <!-- Recording Status -->
                                <div class="flex items-center gap-2">
                                  {#if isRecording}
                                    <div class="flex items-center gap-2 text-red-600">
                                      <div
                                        class="h-2 w-2 animate-pulse rounded-full bg-red-500"
                                      ></div>
                                      <span class="text-xs font-medium">Recording...</span>
                                    </div>
                                  {:else if recordedKeys}
                                    <div class="flex items-center gap-2 text-green-600">
                                      <div class="h-2 w-2 rounded-full bg-green-500"></div>
                                      <span class="text-xs font-medium">Captured</span>
                                    </div>
                                  {/if}
                                </div>

                                <!-- Key Display -->
                                <div class="flex items-center gap-2">
                                  <code
                                    class="flex-1 rounded border px-3 py-2 font-mono text-sm
                                  {isRecording
                                      ? 'border-red-200 bg-red-50 text-red-800'
                                      : recordedKeys && recordedKeys !== originalKeys
                                        ? 'border-green-200 bg-green-50 text-green-800'
                                        : 'border-gray-200 bg-gray-50'}"
                                  >
                                    {#if isRecording}
                                      Press your key combination...
                                    {:else if recordedKeys}
                                      {recordedKeys}
                                    {:else}
                                      {originalKeys}
                                    {/if}
                                  </code>
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
                                      <Button onclick={saveHotkey} size="sm" variant="default"
                                        >Save</Button
                                      >
                                    {/if}
                                    <Button onclick={cancelEdit} size="sm" variant="ghost"
                                      >Cancel</Button
                                    >
                                  {/if}
                                </div>

                                {#if (recordedKeys && recordedKeys !== originalKeys) || hasUnsavedChanges}
                                  <div class="text-xs text-gray-500">
                                    <span>
                                      Make sure to save your changes to apply the new shortcut.
                                    </span>
                                  </div>
                                {/if}
                              </div>
                            {:else}
                              <code
                                class="rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-800"
                              >
                                {shortcut.keys}
                              </code>
                            {/if}
                          </td>
                          <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            <span
                              class="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {shortcut.context || "global"}
                            </span>
                          </td>
                          <td class="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={shortcut.enabled}
                              onchange={(e) =>
                                toggleActionEnabled(shortcut.id, e.currentTarget.checked)}
                              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td class="px-4 py-3 text-center">
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

      <!-- Actions -->
      <div class="flex items-center justify-end pt-4">
        <div class="space-x-2">
          <Button onclick={resetToDefaults} variant="outline">Reset to Defaults</Button>
          <Button onclick={closeDialog}>
            {hasUnsavedChanges ? "Close (Unsaved Changes)" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  table {
    border-collapse: collapse;
  }
</style>
