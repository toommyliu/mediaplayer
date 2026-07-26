import type { QueueItem, RepeatMode } from "@/types";
import { create } from "zustand";
import { clamp } from "@/lib/clamp";
import {
  isObjectRecord,
  readDevSessionState,
  registerDevSessionState,
} from "@/stores/dev-session-storage";
import { makeQueueId } from "@/stores/utils";

export type QueueInsertItem = Omit<QueueItem, "id">;

export interface QueueState {
  index: number;
  items: QueueItem[];
  repeatMode: RepeatMode;
}

export interface QueueActions {
  setQueueState: (next: QueueState) => void;
  setQueueIndex: (index: number) => void;
  setQueueItems: (items: QueueItem[], index?: number) => void;
  setQueueRepeatMode: (repeatMode: RepeatMode) => void;
  toggleRepeatMode: () => void;
  resetQueue: () => void;
  addQueueItem: (item: QueueInsertItem) => boolean;
  addQueueItems: (items: QueueInsertItem[]) => boolean;
  moveQueueItem: (fromIndex: number, toIndex: number) => boolean;
  addQueueItemAtIndex: (item: QueueInsertItem, index: number) => boolean;
  addQueueItemNext: (item: QueueInsertItem) => boolean;
  removeQueueItem: (itemId: string) => boolean;
  shuffleQueue: () => void;
}

export type QueueStore = QueueState & QueueActions;

const initialQueueState: QueueState = {
  index: 0,
  items: [],
  repeatMode: "off",
};

const REPEAT_MODES = new Set<RepeatMode>(["all", "off", "one"]);

function reviveQueueItems(value: unknown): QueueItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): QueueItem[] => {
    if (!isObjectRecord(item)) return [];

    const { duration, id, name, path } = item;
    if (typeof id !== "string" || typeof name !== "string" || typeof path !== "string") {
      return [];
    }

    return [
      {
        duration: typeof duration === "number" && Number.isFinite(duration) ? duration : 0,
        id,
        name,
        path,
      },
    ];
  });
}

function reviveQueueState(value: unknown): QueueState | null {
  if (!isObjectRecord(value)) return null;

  const items = reviveQueueItems(value.items);
  return {
    index:
      typeof value.index === "number" && Number.isFinite(value.index)
        ? Math.round(clamp(value.index, 0, Math.max(0, items.length - 1)))
        : initialQueueState.index,
    items,
    repeatMode: REPEAT_MODES.has(value.repeatMode as RepeatMode)
      ? (value.repeatMode as RepeatMode)
      : initialQueueState.repeatMode,
  };
}

const devQueueState = readDevSessionState("queue-store", reviveQueueState);

export function getCurrentQueueItemFromState(state: QueueState): QueueItem | null {
  return state.items.length > 0 ? (state.items[state.index] ?? null) : null;
}

export const useQueueStore = create<QueueStore>()((set, get) => ({
  ...initialQueueState,
  ...devQueueState,
  setQueueState: (next) => set(next),
  setQueueIndex: (index) => set({ index }),
  setQueueItems: (items, index = 0) => set({ index, items }),
  setQueueRepeatMode: (repeatMode) => set({ repeatMode }),
  toggleRepeatMode: () => {
    const repeatMode =
      get().repeatMode === "off" ? "all" : get().repeatMode === "all" ? "one" : "off";
    get().setQueueRepeatMode(repeatMode);
  },
  resetQueue: () => set({ index: 0, items: [] }),
  addQueueItem: (item) => {
    if (!item.path || !item.name) return false;
    const existingItem = get().items.find((current) => current.path === item.path);
    if (existingItem) return false;

    set((current) => ({
      items: [...current.items, { ...item, id: makeQueueId(item.path) }],
    }));
    return true;
  },
  addQueueItems: (items) => {
    let added = false;
    for (const item of items) {
      if (get().addQueueItem(item)) {
        added = true;
      }
    }
    return added;
  },
  moveQueueItem: (fromIndex, toIndex) => {
    const state = get();
    const items = [...state.items];

    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
      return false;
    }

    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);

    let nextIndex = state.index;
    if (nextIndex === fromIndex) {
      nextIndex = toIndex;
    } else if (fromIndex < nextIndex && toIndex >= nextIndex) {
      nextIndex -= 1;
    } else if (fromIndex > nextIndex && toIndex <= nextIndex) {
      nextIndex += 1;
    }

    set({ index: nextIndex, items });
    return true;
  },
  addQueueItemAtIndex: (item, index) => {
    if (!item.path || !item.name) return false;

    const state = get();
    const existingIndex = state.items.findIndex((current) => current.path === item.path);
    if (existingIndex !== -1) {
      let targetIndex = index;
      if (existingIndex < index) {
        targetIndex = Math.max(0, index - 1);
      }
      return get().moveQueueItem(existingIndex, targetIndex);
    }

    const items = [...state.items];
    const safeIndex = clamp(index, 0, items.length);
    items.splice(safeIndex, 0, { ...item, id: makeQueueId(item.path) });

    set((current) => ({
      index: safeIndex <= current.index ? current.index + 1 : current.index,
      items,
    }));
    return true;
  },
  addQueueItemNext: (item) => get().addQueueItemAtIndex(item, get().index + 1),
  removeQueueItem: (itemId) => {
    const state = get();
    const index = state.items.findIndex((item) => item.id === itemId);
    if (index === -1) return false;

    const items = state.items.filter((item) => item.id !== itemId);
    let nextIndex = state.index;
    if (nextIndex > index) {
      nextIndex -= 1;
    } else if (nextIndex === index && nextIndex >= items.length) {
      nextIndex = Math.max(0, items.length - 1);
    }

    set({ index: nextIndex, items });
    return true;
  },
  shuffleQueue: () => {
    const state = get();
    const currentItem = getCurrentQueueItemFromState(state);
    if (!currentItem || state.items.length <= 1) return;

    const otherItems = state.items.filter((item) => item.id !== currentItem.id);
    for (let index = otherItems.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [otherItems[index], otherItems[randomIndex]] = [otherItems[randomIndex], otherItems[index]];
    }

    set({ index: 0, items: [currentItem, ...otherItems] });
  },
}));

registerDevSessionState(
  "queue-store",
  useQueueStore,
  (state): QueueState => ({
    index: state.index,
    items: state.items,
    repeatMode: state.repeatMode,
  }),
);

export function useCurrentQueueItem(): QueueItem | null {
  return useQueueStore((state) => getCurrentQueueItemFromState(state));
}
