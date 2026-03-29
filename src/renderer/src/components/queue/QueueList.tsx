import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueueView } from "@/lib/store";
import { QueueItem } from "./QueueItem";

export function QueueList() {
  const queue = useQueueView();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: queue.items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
    getItemKey: (index) => queue.items[index]?.id || index,
  });

  return (
    <ScrollArea className="flex-1" hideScrollbar scrollFade viewportRef={parentRef}>
      <div className="px-1 py-1">
        <div
          className="relative w-full"
          style={{
            height: `${virtualizer.getTotalSize()}px`
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full py-0.5"
              style={{
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              <QueueItem index={virtualItem.index} item={queue.items[virtualItem.index]} />
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}