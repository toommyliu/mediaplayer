<script lang="ts">
  import * as Dialog from "@/components/ui/dialog";
  import HotkeySettings from "./hotkey-settings.svelte";
  import IconSettings from "lucide-svelte/icons/settings";
  import IconKeyboard from "lucide-svelte/icons/keyboard";
  import IconPlayerPlay from "lucide-svelte/icons/play";
  import IconVolume2 from "lucide-svelte/icons/volume-2";

  import SunIcon from "lucide-svelte/icons/sun";
  import MoonIcon from "lucide-svelte/icons/moon";
  import MonitorIcon from "lucide-svelte/icons/monitor";
  import ChevronDownIcon from "lucide-svelte/icons/chevron-down";

  import { resetMode, setMode, mode } from "mode-watcher";
  import * as DropdownMenu from "@/components/ui/dropdown-menu/";
  import { Label } from "@/components/ui/label";

  let { open: isOpen = $bindable() }: { open: boolean } = $props();

  const SettingsCategory = {
    General: "general",
    Playback: "playback",
    Audio: "audio",
    Shortcuts: "shortcuts"
  } as const;

  const categoryItems = [
    {
      id: SettingsCategory.General,
      label: "General",
      icon: IconSettings
    },
    {
      id: SettingsCategory.Playback,
      label: "Playback",
      icon: IconPlayerPlay
    },
    {
      id: SettingsCategory.Audio,
      label: "Audio",
      icon: IconVolume2
    },
    {
      id: SettingsCategory.Shortcuts,
      label: "Keyboard Shortcuts",
      icon: IconKeyboard
    }
  ];

  let selectedCategory: string = $state(SettingsCategory.General);
</script>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Content
    class="flex h-[85vh] w-[90vw] max-w-6xl flex-col overflow-hidden p-0 sm:max-w-none"
    showCloseButton={true}
  >
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <aside class="border-sidebar-border bg-sidebar w-72 flex-shrink-0 border-r">
        <div class="flex h-full flex-col">
          <div class="p-4">
            <nav class="space-y-1">
              {#each categoryItems as category (category.id)}
                {@const IconComponent = category.icon}
                <button
                  class="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 {selectedCategory ===
                  category.id
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}"
                  onclick={() => (selectedCategory = category.id)}
                >
                  <IconComponent
                    size={18}
                    class={selectedCategory === category.id
                      ? "text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"}
                  />
                  <div class="text-sm font-medium">{category.label}</div>
                </button>
              {/each}
            </nav>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto">
        <div class="p-6">
          <div class="space-y-6">
            {#if selectedCategory === SettingsCategory.General}
              <div class="space-y-6">
                <div class="flex flex-col space-y-3">
                  <Label class="text-foreground text-base font-medium">Application Theme</Label>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                      class="bg-card border-border text-card-foreground hover:bg-accent hover:border-accent-foreground focus:ring-ring focus:ring-offset-background inline-flex w-fit items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
                    >
                      <div class="flex items-center gap-2">
                        {#if mode.current === "light"}
                          <SunIcon class="h-4 w-4 text-yellow-500" />
                          <span>Light</span>
                        {:else if mode.current === "dark"}
                          <MoonIcon class="h-4 w-4 text-blue-400" />
                          <span>Dark</span>
                        {:else}
                          <MonitorIcon class="text-muted-foreground h-4 w-4" />
                          <span>System</span>
                        {/if}
                      </div>
                      <ChevronDownIcon class="text-muted-foreground h-4 w-4" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="start" class="w-48">
                      <DropdownMenu.Item
                        onclick={() => setMode("light")}
                        class="flex items-center gap-2 {mode.current === 'light'
                          ? 'bg-blue-600 text-white'
                          : ''}"
                      >
                        <SunIcon class="h-4 w-4 text-yellow-500" />
                        Light
                        {#if mode.current === "light"}
                          <div class="ml-auto h-2 w-2 rounded-full bg-white"></div>
                        {/if}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onclick={() => setMode("dark")}
                        class="flex items-center gap-2 {mode.current === 'dark'
                          ? 'bg-blue-600 text-white'
                          : ''}"
                      >
                        <MoonIcon class="h-4 w-4 text-blue-400" />
                        Dark
                        {#if mode.current === "dark"}
                          <div class="ml-auto h-2 w-2 rounded-full bg-white"></div>
                        {/if}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onclick={() => resetMode()}
                        class="flex items-center gap-2 {mode.current !== 'light' &&
                        mode.current !== 'dark'
                          ? 'bg-blue-600 text-white'
                          : ''}"
                      >
                        <MonitorIcon class="text-muted-foreground h-4 w-4" />
                        System
                        {#if mode.current !== "light" && mode.current !== "dark"}
                          <div class="ml-auto h-2 w-2 rounded-full bg-white"></div>
                        {/if}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>
              </div>
            {:else if selectedCategory === SettingsCategory.Playback}
              <div class="space-y-4">
                <div class="bg-card rounded-lg p-4">
                  <h3 class="text-card-foreground mb-2 text-lg font-medium">Playback Options</h3>
                  <p class="text-muted-foreground mb-3 text-sm">
                    Configure video and media playback
                  </p>
                  <div class="text-muted-foreground text-sm">
                    Playback settings will be implemented here.
                  </div>
                </div>
              </div>
            {:else if selectedCategory === SettingsCategory.Audio}
              <div class="space-y-4">
                <div class="bg-card rounded-lg p-4">
                  <h3 class="text-card-foreground mb-2 text-lg font-medium">Audio Settings</h3>
                  <p class="text-muted-foreground mb-3 text-sm">
                    Audio output and processing options
                  </p>
                  <div class="text-muted-foreground text-sm">
                    Audio settings will be implemented here.
                  </div>
                </div>
              </div>
            {:else if selectedCategory === SettingsCategory.Shortcuts}
              <div class="space-y-4">
                <div class="bg-card rounded-lg p-4">
                  <h3 class="text-card-foreground mb-2 text-lg font-medium">Keyboard Shortcuts</h3>
                  <p class="text-muted-foreground mb-3 text-sm">
                    Customize hotkeys and key bindings
                  </p>
                  <HotkeySettings />
                </div>
              </div>
            {/if}
          </div>
        </div>
      </main>
    </div>
  </Dialog.Content>
</Dialog.Root>
