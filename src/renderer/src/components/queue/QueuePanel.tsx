import { useQueueStore } from "@/stores/queue";
import { ClearQueueButton } from "../ClearQueueButton";
import { RepeatButton } from "../RepeatButton";
import { ShuffleButton } from "../ShuffleButton";
import { QueueEmptyState } from "./QueueEmptyState";
import { QueueList } from "./QueueList";

export function QueuePanel() {
  const queueItemsLength = useQueueStore((state) => state.items.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 pt-1">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShuffleButton />
          <RepeatButton />
        </div>

        <ClearQueueButton />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {queueItemsLength === 0 ? <QueueEmptyState /> : <QueueList />}
      </div>
    </div>
  );
}
