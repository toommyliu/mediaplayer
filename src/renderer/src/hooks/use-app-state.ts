import {
  useFileBrowserView,
  useHotkeysView,
  useNotificationsView,
  usePlatformView,
  usePlayerView,
  useQueueView,
  useSettingsView,
  useSidebarView,
  useVolumeView
} from "@/lib/store";

export function useAppState() {
  return {
    fileBrowser: useFileBrowserView(),
    hotkeys: useHotkeysView(),
    notifications: useNotificationsView(),
    platform: usePlatformView(),
    player: usePlayerView(),
    queue: useQueueView(),
    settings: useSettingsView(),
    sidebar: useSidebarView(),
    volume: useVolumeView()
  };
}
