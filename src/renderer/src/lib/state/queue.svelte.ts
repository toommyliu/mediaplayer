import { RepeatMode } from "$/types";

class QueueState {
  public items = $state<QueueItem[]>([]);

  public index = $state(0);

  public get currentItem(): QueueItem | null {
    return this.items.length > 0 ? this.items[this.index] : null;
  }

  public repeatMode = $state<RepeatMode>(RepeatMode.Off);
}

export const queue = new QueueState();

export type QueueItem = {
  duration?: number;
  id: string;
  name: string;
  path: string;
};
