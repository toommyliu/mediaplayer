import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react"

import {
  useNotificationsView,
  usePlayerView,
  useQueueView
} from "@/lib/store";
import { cn } from "@/lib/utils";

export function UpNextNotification() {
  const player = usePlayerView();
  const queue = useQueueView();
  const notifications = useNotificationsView();
  const [isDismissed, setIsDismissed] = useState(false);

  const remaining = player.duration - player.currentTime;
  const showNotification =
    notifications.upNextEnabled &&
    !isDismissed &&
    player.duration > 0 &&
    remaining <= 10 &&
    remaining > 0 &&
    (queue.index < queue.items.length - 1 || queue.repeatMode === "all");

  useEffect(() => {
    setIsDismissed(false);
  }, [player.currentVideo]);

  if (!showNotification) return null;

  const nextItem =
    queue.index < queue.items.length - 1 ? queue.items[queue.index + 1] : queue.items[0];

  const positionClass = {
    "bottom-left": "bottom-24 left-8",
    "bottom-right": "bottom-24 right-8",
    "top-left": "top-8 left-8",
    "top-right": "top-8 right-8"
  }[notifications.upNextPosition as keyof typeof notifications.upNextPosition] || "bottom-right";

  return (
    <div
      className={cn("absolute z-40 flex w-64 flex-col gap-2 rounded-lg bg-card/95 p-3 shadow-xl ring-1 ring-foreground/10",
        positionClass
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Up Next</span>
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
            &middot; {Math.ceil(remaining)}s
          </span>
        </div>
        <Button
          className="text-muted-foreground/60 hover:text-foreground"
          onClick={() => setIsDismissed(true)}
          size="icon-xs"
          variant="ghost"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="line-clamp-2 text-xs font-medium leading-relaxed">
        {nextItem?.name}
      </div>
    </div>
  );
}
