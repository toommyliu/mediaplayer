import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { QueueItem } from "./QueueItem";
import { useQueueStore } from "@stores/queue";

export function QueueList() {
  const items = useQueueStore((state) => state.items);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
    getItemKey: (index) => items[index]?.id || index
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
              <QueueItem index={virtualItem.index} item={items[virtualItem.index]} />
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
