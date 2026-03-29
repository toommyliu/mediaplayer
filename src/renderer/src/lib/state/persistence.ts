export const STORAGE_KEYS = {
  hotkeys: "mediaplayer-hotkeys",
  notificationUpNextEnabled: "notification:upNextEnabled",
  notificationUpNextPosition: "notification:upNextPosition",
  notificationVideoInfoEnabled: "notification:videoInfoEnabled",
  sidebarPosition: "sidebar:position",
  sidebarWidth: "sidebar:width",
  volume: "volume"
} as const;

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
