import { playerState, type QueueItem } from "../state.svelte";
import { logger } from "./logger";

export class QueueManager {
  /**
   * Initialize queue (no storage - queue exists only in memory)
   */
  public static initialize(): void {
    playerState.queue = [];
    playerState.currentIndex = 0;
  }

  /**
   * Add an item to the queue
   */
  public static addToQueue(item: Omit<QueueItem, "addedAt" | "id">): boolean {
    const existingItem = playerState.queue.find((existing) => existing.path === item.path);
    if (existingItem) {
      console.warn(`Item already exists in queue: ${item.path}`);
      return false;
    }

    const newItem: QueueItem = {
      ...item,
      id: crypto.randomUUID(),
      addedAt: new Date()
    };

    playerState.queue.push(newItem);
    return true;
  }

  /**
   * Add multiple items to the queue
   */
  public static addMultipleToQueue(
    items: { duration?: number; name: string; path: string }[]
  ): boolean {
    let added = 0;
    for (const item of items) {
      const success = this.addToQueue(item);
      if (success) {
        added++;
      }
    }

    if (added > 0) {
      logger.debug(`Added ${added} items to queue`);
    }

    return added === items.length;
  }

  /**
   * Remove an item from the queue
   */
  public static removeFromQueue(itemId: string): boolean {
    const index = playerState.queue.findIndex((item) => item.id === itemId);
    if (index === -1) return false;

    playerState.queue.splice(index, 1);

    // Adjust current index if necessary
    if (playerState.currentIndex > index) {
      playerState.currentIndex--;
    } else if (
      playerState.currentIndex === index &&
      playerState.currentIndex >= playerState.queue.length
    ) {
      // If we're removing the currently playing item and it's the last item
      playerState.currentIndex = Math.max(0, playerState.queue.length - 1);
    }

    return true;
  }

  /**
   * Clear the entire queue
   */
  public static clearQueue(): void {
    playerState.queue = [];
    playerState.currentIndex = 0;
  }

  /**
   * Move an item in the queue
   */
  public static moveItem(fromIndex: number, toIndex: number): boolean {
    if (
      fromIndex < 0 ||
      fromIndex >= playerState.queue.length ||
      toIndex < 0 ||
      toIndex >= playerState.queue.length
    ) {
      return false;
    }

    const [movedItem] = playerState.queue.splice(fromIndex, 1);
    playerState.queue.splice(toIndex, 0, movedItem);

    // Adjust current index if necessary
    if (playerState.currentIndex === fromIndex) {
      playerState.currentIndex = toIndex;
    } else if (fromIndex < playerState.currentIndex && toIndex >= playerState.currentIndex) {
      playerState.currentIndex--;
    } else if (fromIndex > playerState.currentIndex && toIndex <= playerState.currentIndex) {
      playerState.currentIndex++;
    }

    return true;
  }

  /**
   * Get the next item in the queue
   */
  public static getNextItem(): QueueItem | null {
    if (playerState.queue.length === 0) return null;

    const nextIndex = (playerState.currentIndex + 1) % playerState.queue.length;
    return playerState.queue[nextIndex];
  }

  /**
   * Get the previous item in the queue
   */
  public static getPreviousItem(): QueueItem | null {
    if (playerState.queue.length === 0) return null;

    const prevIndex =
      playerState.currentIndex === 0 ? playerState.queue.length - 1 : playerState.currentIndex - 1;
    return playerState.queue[prevIndex];
  }

  /**
   * Shuffle the queue
   */
  public static shuffleQueue(): void {
    if (playerState.queue.length <= 1) return;

    const currentItem = playerState.queue[playerState.currentIndex];

    // Create a new shuffled array excluding the current item
    const otherItems = playerState.queue.filter((_, index) => index !== playerState.currentIndex);

    // Fisher-Yates shuffle algorithm
    for (let index = otherItems.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [otherItems[index], otherItems[randomIndex]] = [otherItems[randomIndex], otherItems[index]];
    }

    // Rebuild queue with current item first, then shuffled items
    playerState.queue = [currentItem, ...otherItems];
    playerState.currentIndex = 0;
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
