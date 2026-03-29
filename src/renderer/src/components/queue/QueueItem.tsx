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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
      className={cn(
        "group flex items-center gap-3 rounded-md border p-2 text-sm transition-all duration-200",
        {
          "border-primary bg-primary/10": dragOverIndex === index,
          "border-primary/20 bg-primary/5 text-primary": isPlaying,
          "border-transparent hover:bg-muted/40":
            dragOverIndex !== index && !isPlaying
        }
      )}
      draggable
      onClick={() => playbackCommands.playVideo(item.path)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOverIndex(index);
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(index));
      }}
      onDragEnd={() => setDragOverIndex(null)}
      onDrop={(event) => {
        event.preventDefault();
        const fromIndex = Number.parseInt(
          event.dataTransfer.getData("text/plain"),
          10
        );
        if (!Number.isNaN(fromIndex) && fromIndex !== index) {
          queueCommands.moveQueueItem(fromIndex, index);
        }
        setDragOverIndex(null);
      }}
      role="button"
      tabIndex={0}
    >
      <span className="w-4 text-center text-[10px] font-medium text-muted-foreground/60 tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium leading-tight">{item.name}</div>
        {item.duration ? (
          <div className="mt-0.5 text-[10px] text-muted-foreground/70">
            {makeTimeString(item.duration)}
          </div>
        ) : null}
      </div>

      <Button
        className="hidden size-6 p-0 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive group-hover:inline-flex"
        onClick={(event) => {
          event.stopPropagation();
          removeItem(item);
        }}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
