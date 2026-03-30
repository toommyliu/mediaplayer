// import { TanStackDevtools } from "@tanstack/react-devtools";
// import { hotkeysDevtoolsPlugin } from "@tanstack/react-hotkeys-devtools";
import { HotkeysProvider as THotkeysProvider, useHotkey } from "@tanstack/react-hotkeys";
import { runHotkeyAction } from "@/lib/controllers/hotkey-controller";
import { useMemo } from "react";
import type { HotkeyCategory } from "@/types";
import type { RegisterableHotkey } from "@tanstack/react-hotkeys";
import { getStoredHotkeys, useHotkeysStore } from "@/stores/hotkeys";
import { usePlatformStore } from "@/stores/platform";
import { useSettingsStore } from "@/stores/settings";

function convertHotkeyFormat(keys: string[]): string[] {
  return keys.map((key) => {
    return key
      .replace(/\b(command|ctrl)\b/gi, "Mod")
      .replace(/\bleft\b/gi, "ArrowLeft")
      .replace(/\bright\b/gi, "ArrowRight")
      .replace(/\bup\b/gi, "ArrowUp")
      .replace(/\bdown\b/gi, "ArrowDown")
      .replace(/\bspace\b/gi, "Space");
  });
}

function buildDefaultCategories(modKey: string): HotkeyCategory[] {
  return [
    {
      actions: [
        { description: "Play/Pause video", id: "playPause", keys: ["space"] },
        { description: "Previous video", id: "previousTrack", keys: [`${modKey}+left`] },
        { description: "Next video", id: "nextTrack", keys: [`${modKey}+right`] },
        { description: "Seek backward", id: "seekBackward", keys: ["left"] },
        { description: "Seek forward", id: "seekForward", keys: ["right"] },
        { description: "Frame backward", id: "frameBackward", keys: [","] },
        { description: "Frame forward", id: "frameForward", keys: ["."] },
        { description: "Volume up", id: "volumeUp", keys: ["up"] },
        { description: "Volume down", id: "volumeDown", keys: ["down"] },
        { description: "Toggle mute", id: "mute", keys: ["m"] },
        { description: "Toggle fullscreen", id: "fullscreen", keys: ["f"] }
      ],
      name: "Playback"
    },
    {
      actions: [
        { description: "Show file browser", id: "showFileBrowser", keys: [`${modKey}+1`] },
        { description: "Show queue", id: "showQueue", keys: [`${modKey}+2`] },
        { description: "Toggle sidebar", id: "toggleSidebar", keys: [`${modKey}+b`] },
        { description: "Navigate back in file browser", id: "fileBrowserBack", keys: ["alt+left"] }
      ],
      name: "Navigation"
    },
    {
      actions: [],
      name: "Time Navigation"
    },
    {
      actions: [
        {
          configurable: false,
          description: "Open settings",
          id: "openSettings",
          keys: [`${modKey}+,`]
        }
      ],
      name: "Application"
    }
  ];
}

function cloneCategory(category: HotkeyCategory): HotkeyCategory {
  return {
    actions: category.actions.map((action) => ({ ...action, keys: [...action.keys] })),
    name: category.name
  };
}

function useHotkeysCategories(): HotkeyCategory[] {
  const categories = useHotkeysStore((state) => state.categories);
  const setHotkeyCategories = useHotkeysStore((state) => state.setHotkeyCategories);

  return useMemo(() => {
    if (categories.length > 0) {
      return categories;
    }

    const modKey = usePlatformStore.getState().isMac ? "command" : "ctrl";
    const defaultCategories = buildDefaultCategories(modKey);

    const stored = getStoredHotkeys();
    if (stored) {
      for (const category of defaultCategories) {
        for (const action of category.actions) {
          if (stored[action.id]) {
            action.keys = stored[action.id];
          }
        }
      }
    }

    const cloned = defaultCategories.map(cloneCategory);
    setHotkeyCategories(cloned, modKey, true);
    return cloned;
  }, [categories, setHotkeyCategories]);
}

function HotkeysRegistrar() {
  const categories = useHotkeysCategories();
  const showDialog = useSettingsStore((state) => state.showDialog);

  for (const category of categories) {
    for (const action of category.actions) {
      const hotkeys = convertHotkeyFormat(action.keys);
      for (const hotkey of hotkeys) {
        useHotkey(hotkey as RegisterableHotkey, () => runHotkeyAction(action.id), {
          enabled: action.enabled !== false && !showDialog
        });
      }
    }
  }

  for (let i = 0; i <= 9; i++) {
    useHotkey(String(i) as RegisterableHotkey, () => runHotkeyAction(`jump-${i}`), {
      enabled: !showDialog
    });
  }

  return null;
}

export function HotkeysProvider({ children }: { children: React.ReactNode }) {
  return (
    <THotkeysProvider
      defaultOptions={{
        hotkey: { preventDefault: true }
      }}
    >
      <HotkeysRegistrar />
      {/* <TanStackDevtools plugins={[hotkeysDevtoolsPlugin()]} /> */}
      {children}
    </THotkeysProvider>
  );
}
