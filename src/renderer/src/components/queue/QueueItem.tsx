import { Button } from "@/components/ui/button"
import { X } from "lucide-react";
import { useState } from "react";

import { makeTimeString } from "@/lib/make-time-string";
import { useQueueView, useCurrentQueueItem, queueCommands, playbackCommands } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { QueueItem as QueueItemType } from "@/types";

export interface QueueItemProps {
  index: number;
  item: QueueItemType;
}

export function QueueItem({ index, item }: QueueItemProps) {
  const queue = useQueueView();
  const currentItem = useCurrentQueueItem();
  const [dropPosition, setDropPosition] = useState<"top" | "bottom" | null>(null);

  function removeItem(item: QueueItemType): void {
    const isCurrent = currentItem?.id === item.id;
    if (!isCurrent) {
      queueCommands.removeFromQueue(item.id);
      return;
    }

    const currentIndex = queue.items.findIndex((queueItem) => queueItem.id === item.id);
    let nextVideoToPlay: string | null = null;

    if (queue.items.length > 1) {
      if (currentIndex < queue.items.length - 1) {
        nextVideoToPlay = queue.items[currentIndex + 1].path;
      } else if (currentIndex > 0) {
        nextVideoToPlay = queue.items[currentIndex - 1].path;
      }
    }

    queueCommands.removeFromQueue(item.id);

    if (nextVideoToPlay) {
      playbackCommands.playVideo(nextVideoToPlay);
    } else {
      playbackCommands.stopPlayback(true);
    }
  }

  const isPlaying = currentItem?.id === item.id;
  return (
    <div
      key={item.id}
      data-slot="queue-item"
      className={cn(
        "group/queue-item relative flex items-center gap-2.5 rounded-lg ring-1 ring-foreground/10 px-3 py-1.5 text-xs transition-all duration-200 select-none",
        {
          "ring-primary/20 bg-primary/5 text-primary": isPlaying,
          "ring-transparent hover:bg-muted/40": !isPlaying
        }
      )}
      draggable
      onClick={() => playbackCommands.playVideo(item.path)}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        setDropPosition(relativeY < rect.height / 2 ? "top" : "bottom");
      }}
      onDragLeave={() => setDropPosition(null)}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(index));
      }}
      onDragEnd={() => setDropPosition(null)}
      onDrop={(event) => {
        event.preventDefault();
        const fromIndex = Number.parseInt(
          event.dataTransfer.getData("text/plain"),
          10
        );
        if (!Number.isNaN(fromIndex)) {
          let targetIndex = index;
          if (dropPosition === "bottom") {
            targetIndex = index + 1;
          }

          if (fromIndex !== targetIndex && fromIndex !== targetIndex - 1) {
            queueCommands.moveQueueItem(fromIndex, targetIndex > fromIndex ? targetIndex - 1 : targetIndex);
          }
        }
        setDropPosition(null);
      }}
      role="button"
      tabIndex={0}
    >
      {dropPosition && (
        <div
          className={cn(
            "absolute left-0 right-0 h-0.5 bg-primary z-50 pointer-events-none",
            dropPosition === "top" ? "-top-px" : "-bottom-px"
          )}
        />
      )}

      <span className="w-4 text-center text-[0.625rem] font-medium text-muted-foreground/60 tabular-nums">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium leading-tight">{item.name}</div>
        {item.duration ? (
          <div className="mt-0.5 text-[0.625rem] text-muted-foreground/60">
            {makeTimeString(item.duration)}
          </div>
        ) : null}
      </div>

      <Button
        className="hidden size-5 p-0 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive group-hover/queue-item:inline-flex"
        data-slot="queue-item-remove"
        onClick={(event) => {
          event.stopPropagation();
          removeItem(item);
        }}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
