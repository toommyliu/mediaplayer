
import { ClearQueueButton } from "./ClearQueueButton";
import { EmptyQueuePanel } from "./EmptyQueuePanel";
import { RepeatButton } from "./RepeatButton";
import { ShuffleButton } from "./ShuffleButton";
import { QueueList } from "./QueueList";

import { useQueueView } from "@/lib/store";

export function QueuePanel() {
  const queue = useQueueView();

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
        {queue.items.length === 0 ? (
          <EmptyQueuePanel />
        ) : (
          <QueueList />
        )}
      </div >
    </div >
  );
}
