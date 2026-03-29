import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/lib/icons";
import {
  useNotificationsView,
  usePlayerView,
  useQueueView
} from "@/lib/store";

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
      className={`absolute z-40 flex max-w-sm flex-col gap-3 rounded-xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur-md ${positionClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Up Next
        </span>
        <Button
          className="size-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => setIsDismissed(true)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <CloseIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="line-clamp-2 text-base font-semibold">{nextItem?.name}</div>
      <div className="h-1 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, (remaining / 10) * 100))}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">Playing in {Math.ceil(remaining)}s</div>
    </div>
  );
}
