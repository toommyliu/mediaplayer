<script lang="ts">
  import HotkeySettings from "../hotkey-settings.svelte";
</script>

<div class="flex h-full flex-col space-y-4">
  <div class="flex items-center justify-between">
    <h2 class="text-lg font-semibold text-white">Settings</h2>
  </div>

  <div class="flex-1 space-y-6 overflow-y-auto">
    <div class="space-y-3">
      <h3 class="text-sm font-medium text-gray-300">Keyboard Shortcuts</h3>
      <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <p class="mb-3 text-sm text-gray-400">Configure keyboard shortcuts and hotkey behavior</p>
        <HotkeySettings />
      </div>
    </div>

    <div class="space-y-3">
      <h3 class="text-sm font-medium text-gray-300">Playback</h3>
      <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <p class="text-sm text-gray-400">Playback settings will be added here in future updates.</p>
      </div>
    </div>

    <div class="space-y-3">
      <h3 class="text-sm font-medium text-gray-300">Interface</h3>
      <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <p class="text-sm text-gray-400">
          Interface settings will be added here in future updates.
        </p>
      </div>
    </div>
  </div>
</div>
