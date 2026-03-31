import type { Bookmark } from "@/lib/contracts";
import { X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { makeTimeString } from "@/lib/make-time-string";
import { cn } from "@/lib/utils";
import { useBookmarksStore } from "@/stores/bookmarks";
import { usePlayerStore } from "@/stores/player";
import { getVideoElement } from "@/video-element";

export interface BookmarkItemProps {
  item: Bookmark;
}

export function BookmarkItem({ item }: BookmarkItemProps) {
  const deleteBookmark = useBookmarksStore(state => state.deleteBookmark);
  const setCurrentTime = usePlayerStore(state => state.setCurrentTime);

  function jumpToBookmark() {
    setCurrentTime(item.timestamp);
    const video = getVideoElement();
    if (video) {
      video.currentTime = item.timestamp;
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={props => (
          <div
            {...props}
            className={cn(
              "group/bookmark-item relative flex h-6 w-full items-center justify-between rounded-full bg-secondary pl-2.5 pr-1.5 text-[0.625rem] font-medium transition-all duration-200 select-none cursor-pointer ring-1 ring-inset ring-foreground/5 hover:bg-accent hover:text-foreground",
            )}
            onClick={jumpToBookmark}
            role="button"
            tabIndex={0}
          >
            <span className="truncate tabular-nums text-left">
              {makeTimeString(item.timestamp)}
            </span>

            <button
              className="text-muted-foreground/40 hover:text-destructive flex size-4 shrink-0 items-center justify-center rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                deleteBookmark(item.id);
              }}
              type="button"
            >
              <X className="size-2.5" />
            </button>
          </div>
        )}
      />
      {item.label && (
        <TooltipContent side="top" sideOffset={8}>
          {item.label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
