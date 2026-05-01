import type { DragEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQueueStore } from "@/stores/queue";
import { QueueItem } from "./QueueItem";

const QUEUE_ITEM_DRAG_TYPE = "application/x-mediaplayer-queue-index";

function getInsertionIndicatorOffset(
  insertionIndex: number,
  virtualItems: Array<{ index: number; size: number; start: number }>,
  itemCount: number,
): number | null {
  if (insertionIndex >= itemCount) {
    const lastItem = virtualItems.find(item => item.index === itemCount - 1);
    return lastItem ? lastItem.start + lastItem.size : null;
  }

  return (
    virtualItems.find(item => item.index === insertionIndex)?.start ?? null
  );
}

export function QueueList() {
  const items = useQueueStore(state => state.items);
  const moveQueueItem = useQueueStore(state => state.moveQueueItem);
  const parentRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
    getItemKey: index => items[index]?.id || index,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const activeInsertionIndex
    = draggedIndex !== null
      && insertionIndex !== null
      && draggedIndex !== insertionIndex
      && draggedIndex !== insertionIndex - 1
      ? insertionIndex
      : null;
  const indicatorOffset
    = activeInsertionIndex === null
      ? null
      : getInsertionIndicatorOffset(
          activeInsertionIndex,
          virtualItems,
          items.length,
        );

  function getInsertionIndex(
    event: DragEvent<HTMLDivElement>,
    index: number,
  ): number {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    return relativeY < rect.height / 2 ? index : index + 1;
  }

  function resetDragState(): void {
    setDraggedIndex(null);
    setInsertionIndex(null);
  }

  return (
    <ScrollArea
      className="flex-1"
      hideScrollbar
      scrollFade
      viewportRef={parentRef}
    >
      <div className="px-1 py-1">
        <div
          className="relative w-full"
          onDragLeave={(event) => {
            if (
              event.relatedTarget
              && event.currentTarget.contains(event.relatedTarget as Node)
            ) {
              return;
            }
            setInsertionIndex(null);
          }}
          style={{
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          {indicatorOffset !== null
            ? (
                <div
                  className="pointer-events-none absolute right-2 left-2 z-50 h-3 -translate-y-1/2"
                  style={{
                    top: `${indicatorOffset}px`,
                  }}
                >
                  <div className="bg-primary absolute top-1/2 right-0 left-2.5 h-0.5 -translate-y-1/2 rounded-full" />
                  <div className="border-background bg-primary absolute top-1/2 left-0 size-2.5 -translate-y-1/2 rounded-full border-2" />
                </div>
              )
            : null}

          {virtualItems.map(virtualItem => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className={cn(
                "absolute top-0 left-0 w-full py-0.5",
                draggedIndex === virtualItem.index && "opacity-50",
              )}
              draggable
              onDragEnd={resetDragState}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const nextInsertionIndex = getInsertionIndex(
                  event,
                  virtualItem.index,
                );
                setInsertionIndex(current =>
                  current === nextInsertionIndex ? current : nextInsertionIndex,
                );
              }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.dropEffect = "move";
                event.dataTransfer.setData(
                  QUEUE_ITEM_DRAG_TYPE,
                  String(virtualItem.index),
                );
                event.dataTransfer.setData(
                  "text/plain",
                  String(virtualItem.index),
                );
                event.dataTransfer.setDragImage(
                  event.currentTarget,
                  16,
                  event.currentTarget.clientHeight / 2,
                );
                setDraggedIndex(virtualItem.index);
                setInsertionIndex(virtualItem.index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "move";

                const fromIndex = Number.parseInt(
                  event.dataTransfer.getData(QUEUE_ITEM_DRAG_TYPE)
                  || event.dataTransfer.getData("text/plain"),
                  10,
                );
                const targetInsertionIndex = getInsertionIndex(
                  event,
                  virtualItem.index,
                );

                if (
                  !Number.isNaN(fromIndex)
                  && fromIndex !== targetInsertionIndex
                  && fromIndex !== targetInsertionIndex - 1
                ) {
                  moveQueueItem(
                    fromIndex,
                    targetInsertionIndex > fromIndex
                      ? targetInsertionIndex - 1
                      : targetInsertionIndex,
                  );
                }

                resetDragState();
              }}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <QueueItem
                index={virtualItem.index}
                item={items[virtualItem.index]}
              />
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
