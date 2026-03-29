import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

import { usePlayerState } from "@/lib/state/player";
import { useQueueState } from "@/lib/state/queue";
import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@stores/notifications";

export function UpNextNotification() {
  const currentTime = usePlayerState((state) => state.currentTime);
  const currentVideo = usePlayerState((state) => state.currentVideo);
  const duration = usePlayerState((state) => state.duration);
  const index = useQueueState((state) => state.index);
  const items = useQueueState((state) => state.items);
  const repeatMode = useQueueState((state) => state.repeatMode);
  const upNextEnabled = useNotificationsStore((state) => state.upNextEnabled);
  const upNextPosition = useNotificationsStore((state) => state.upNextPosition);
  const [isDismissed, setIsDismissed] = useState(false);

  const remaining = duration - currentTime;
  const showNotification =
    upNextEnabled &&
    !isDismissed &&
    duration > 0 &&
    remaining <= 10 &&
    remaining > 0 &&
    (index < items.length - 1 || repeatMode === "all");

  useEffect(() => {
    setIsDismissed(false);
  }, [currentVideo]);

  const nextItem = index < items.length - 1 ? items[index + 1] : items[0];

  const positionClass =
    {
      "bottom-left": "bottom-24 left-8",
      "bottom-right": "bottom-24 right-8",
      "top-left": "top-8 left-8",
      "top-right": "top-8 right-8"
    }[upNextPosition as keyof typeof upNextPosition] || "bottom-right";

  return (
    <div
      className={cn(
        "bg-card/95 ring-foreground/10 absolute z-40 flex w-64 flex-col gap-2 rounded-lg p-3 shadow-xl ring-1 transition-all duration-300 will-change-[transform,opacity]",
        positionClass,
        showNotification
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-2 scale-[0.96] opacity-0"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground text-[11px] font-medium">Up Next</span>
          <span className="text-muted-foreground/50 text-[10px] tabular-nums">
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

      <div className="line-clamp-2 text-xs leading-relaxed font-medium">{nextItem?.name}</div>
    </div>
  );
}
