import type { QueueItem as QueueItemType } from "@/types";
import { X } from "lucide-react";

import { playVideo, stopPlayback } from "@/actions/playback";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { makeTimeString } from "@/lib/make-time-string";
import { cn } from "@/lib/utils";
import { useCurrentQueueItem, useQueueStore } from "@/stores/queue";

export interface QueueItemProps {
  index: number;
  item: QueueItemType;
}

export function QueueItem({ index, item }: QueueItemProps) {
  const queueItems = useQueueStore(state => state.items);
  const removeQueueItem = useQueueStore(state => state.removeQueueItem);
  const currentItem = useCurrentQueueItem();

  function removeItem(item: QueueItemType): void {
    const isCurrent = currentItem?.id === item.id;
    if (!isCurrent) {
      removeQueueItem(item.id);
      return;
    }

    const currentIndex = queueItems.findIndex(
      queueItem => queueItem.id === item.id,
    );
    let nextVideoToPlay: string | null = null;

    if (queueItems.length > 1) {
      if (currentIndex < queueItems.length - 1) {
        nextVideoToPlay = queueItems[currentIndex + 1].path;
      }
      else if (currentIndex > 0) {
        nextVideoToPlay = queueItems[currentIndex - 1].path;
      }
    }

    removeQueueItem(item.id);

    if (nextVideoToPlay) {
      playVideo(nextVideoToPlay);
    }
    else {
      stopPlayback(true);
    }
  }

  const isPlaying = currentItem?.id === item.id;
  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <div
            data-slot="queue-item"
            className={cn(
              "group/queue-item ring-foreground/10 relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs ring-1 transition-all duration-200 select-none cursor-pointer",
              {
                "ring-primary/20 bg-primary/5 text-primary": isPlaying,
                "hover:bg-muted/40 ring-transparent": !isPlaying,
              },
            )}
            onClick={() => playVideo(item.path)}
            role="button"
            tabIndex={0}
          >
            <span className="text-muted-foreground/60 w-4 text-center text-[0.625rem] font-medium tabular-nums">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="truncate leading-tight font-medium">
                {item.name}
              </div>
              {item.duration
                ? (
                    <div className="text-muted-foreground/60 mt-0.5 text-[0.625rem]">
                      {makeTimeString(item.duration)}
                    </div>
                  )
                : null}
            </div>

            <Button
              className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive size-5 p-0 group-hover/queue-item:inline-flex hidden"
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
        )}
      />
      <TooltipContent side="right" sideOffset={10}>
        {item.name}
      </TooltipContent>
    </Tooltip>
  );
}
