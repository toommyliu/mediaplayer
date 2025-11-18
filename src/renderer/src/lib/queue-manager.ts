import { playerState } from "./state/player.svelte";
import { queue, type QueueItem } from "./state/queue.svelte";

export class QueueManager {
  /**
   * Initialize queue (no storage - queue exists only in memory)
   */
  public static initialize(): void {
    queue.items = [];
    queue.index = 0;
  }

  /**
   * Add an item to the queue
   */
  public static addToQueue(item: Omit<QueueItem, "id">): boolean {
    const existingItem = queue.items.find((existing) => existing.path === item.path);

    // TODO: allow duplicates?
    if (existingItem) {
      return false;
    }

    const newItem: QueueItem = {
      ...item,
      id: crypto.randomUUID()
    };

    queue.items = [...queue.items, newItem];
    return true;
  }

  /**
   * Add an item to the queue at a specific index (inserts before the given index).
   */
  public static addToQueueAtIndex(item: Omit<QueueItem, "id">, index: number): boolean {
    if (!item.path || !item.name) return false;

    const existingIndex = queue.items.findIndex((existing) => existing.path === item.path);
    // If the item already exists, move it to the target index instead of creating a duplicate
    if (existingIndex !== -1) {
      // Adjust target index if the existing item is removed prior to insert
      let targetIndex = index;
      if (existingIndex < index) {
        targetIndex = Math.max(0, index - 1);
      }
      return this.moveItem(existingIndex, targetIndex);
    }

    const newItem: QueueItem = {
      ...item,
      id: crypto.randomUUID()
    };

    const items = [...queue.items];
    if (index < 0) index = 0;
    if (index > items.length) index = items.length;
    items.splice(index, 0, newItem);
    queue.items = items;

    if (index <= queue.index) {
      queue.index++;
    }

    return true;
  }

  /**
   * Add item to play next (inserts after current index)
   */
  public static addNextToQueue(item: Omit<QueueItem, "id">): boolean {
    const position = queue.index + 1;
    return this.addToQueueAtIndex(item, position);
  }

  /**
   * Add multiple items to the queue
   */
  public static addMultipleToQueue(
    items: { duration?: number; name: string; path: string }[]
  ): boolean {
    let added = false;
    for (const item of items) {
      if (!item.name || !item.path) {
        continue;
      }

      const success = this.addToQueue(item);
      if (success) added = true;
    }

    return added;
  }

  /**
   * Remove an item from the queue
   */
  public static removeFromQueue(itemId: string): boolean {
    const index = queue.items.findIndex((item) => item.id === itemId);
    if (index === -1) return false;

    // Remove by filtering for Svelte $state reactivity
    queue.items = queue.items.filter((item) => item.id !== itemId);

    // Adjust current index if necessary
    if (queue.index > index) {
      queue.index--;
    } else if (queue.index === index && queue.index >= queue.items.length) {
      queue.index = Math.max(0, queue.items.length - 1);
    }

    return true;
  }

  /**
   * Clear the entire queue
   */
  public static clear(): void {
    queue.items = [];
    queue.index = 0;
  }

  /**
   * Move an item in the queue
   */
  public static moveItem(fromIndex: number, toIndex: number): boolean {
    if (
      fromIndex < 0 ||
      fromIndex >= queue.items.length ||
      toIndex < 0 ||
      toIndex >= queue.items.length
    ) {
      return false;
    }

    // Move item by creating a new array for Svelte $state reactivity
    const items = [...queue.items];
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);
    queue.items = items;

    // Adjust current index if necessary
    if (queue.index === fromIndex) {
      queue.index = toIndex;
    } else if (fromIndex < queue.index && toIndex >= queue.index) {
      queue.index--;
    } else if (fromIndex > queue.index && toIndex <= queue.index) {
      queue.index++;
    }

    return true;
  }

  /**
   * Shuffle the queue
   */
  public static shuffleQueue(): void {
    if (queue.items.length <= 1) return;

    const currentItem = queue.currentItem!;
    const otherItems = queue.items.filter((_, index) => index !== queue.index);

    // Fisher-Yates shuffle
    for (let index = otherItems.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [otherItems[index], otherItems[randomIndex]] = [otherItems[randomIndex], otherItems[index]];
    }

    // Assign new array for Svelte $state reactivity
    queue.items = [currentItem, ...otherItems];
    queue.index = 0;
  }

  /**
   * Toggle repeat mode (off \> all \> one \> off)
   */
  public static toggleRepeatMode(): void {
    switch (playerState.repeatMode) {
      case "off":
        playerState.repeatMode = "all";
        break;
      case "all":
        playerState.repeatMode = "one";
        break;
      case "one":
        playerState.repeatMode = "off";
        break;
    }
  }
}
