import { create } from "zustand";
import type { QueueItem, RepeatMode } from "@/types";
import { clamp, makeQueueId } from "@/lib/state/utils";

type QueueState = {
  index: number;
  items: QueueItem[];
  repeatMode: RepeatMode;
};

type QueueInsertItem = Omit<QueueItem, "id">;

const useQueueStoreBase = create<QueueState>(() => ({
  index: 0,
  items: [],
  repeatMode: "off"
}));

export function useQueueState<T>(selector: (state: QueueState) => T): T {
  return useQueueStoreBase(selector);
}

export function getQueueState(): QueueState {
  return useQueueStoreBase.getState();
}

export function setQueueState(next: QueueState): void {
  useQueueStoreBase.setState(next);
}

export function setQueueIndex(index: number): void {
  useQueueStoreBase.setState((state) => ({
    ...state,
    index
  }));
}

export function setQueueItems(items: QueueItem[], index = 0): void {
  useQueueStoreBase.setState((state) => ({
    ...state,
    index,
    items
  }));
}

export function setQueueRepeatMode(repeatMode: RepeatMode): void {
  useQueueStoreBase.setState((state) => ({
    ...state,
    repeatMode
  }));
}

export function toggleRepeatMode(): void {
  const repeatMode =
    getQueueState().repeatMode === "off"
      ? "all"
      : getQueueState().repeatMode === "all"
        ? "one"
        : "off";

  setQueueRepeatMode(repeatMode);
}

export function resetQueue(): void {
  useQueueStoreBase.setState((state) => ({
    ...state,
    index: 0,
    items: []
  }));
}

export function addQueueItem(item: QueueInsertItem): boolean {
  if (!item.path || !item.name) return false;

  const state = getQueueState();
  const existingItem = state.items.find((current) => current.path === item.path);
  if (existingItem) return false;

  useQueueStoreBase.setState((current) => ({
    ...current,
    items: [
      ...current.items,
      {
        ...item,
        id: makeQueueId(item.path)
      }
    ]
  }));

  return true;
}

export function addQueueItems(items: QueueInsertItem[]): boolean {
  let added = false;
  for (const item of items) {
    if (addQueueItem(item)) {
      added = true;
    }
  }
  return added;
}

export function moveQueueItem(fromIndex: number, toIndex: number): boolean {
  const state = getQueueState();
  const items = [...state.items];

  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length
  ) {
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

  useQueueStoreBase.setState((current) => ({
    ...current,
    index: nextIndex,
    items
  }));

  return true;
}

export function addQueueItemAtIndex(item: QueueInsertItem, index: number): boolean {
  if (!item.path || !item.name) return false;

  const state = getQueueState();
  const existingIndex = state.items.findIndex((current) => current.path === item.path);
  if (existingIndex !== -1) {
    let targetIndex = index;
    if (existingIndex < index) {
      targetIndex = Math.max(0, index - 1);
    }
    return moveQueueItem(existingIndex, targetIndex);
  }

  const items = [...state.items];
  const safeIndex = clamp(index, 0, items.length);
  items.splice(safeIndex, 0, {
    ...item,
    id: makeQueueId(item.path)
  });

  useQueueStoreBase.setState((current) => ({
    ...current,
    index: safeIndex <= current.index ? current.index + 1 : current.index,
    items
  }));

  return true;
}

export function addQueueItemNext(item: QueueInsertItem): boolean {
  return addQueueItemAtIndex(item, getQueueState().index + 1);
}

export function removeQueueItem(itemId: string): boolean {
  const state = getQueueState();
  const index = state.items.findIndex((item) => item.id === itemId);
  if (index === -1) return false;

  const items = state.items.filter((item) => item.id !== itemId);
  let nextIndex = state.index;
  if (nextIndex > index) {
    nextIndex -= 1;
  } else if (nextIndex === index && nextIndex >= items.length) {
    nextIndex = Math.max(0, items.length - 1);
  }

  useQueueStoreBase.setState((current) => ({
    ...current,
    index: nextIndex,
    items
  }));

  return true;
}

export function shuffleQueue(): void {
  const state = getQueueState();
  const currentItem = getCurrentQueueItemFromState(state);
  if (!currentItem || state.items.length <= 1) return;

  const otherItems = state.items.filter((item) => item.id !== currentItem.id);
  for (let index = otherItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [otherItems[index], otherItems[randomIndex]] = [otherItems[randomIndex], otherItems[index]];
  }

  useQueueStoreBase.setState((current) => ({
    ...current,
    index: 0,
    items: [currentItem, ...otherItems]
  }));
}

export function getCurrentQueueItemFromState(state: QueueState): QueueItem | null {
  return state.items.length > 0 ? state.items[state.index] ?? null : null;
}

export type { QueueState, QueueInsertItem };
