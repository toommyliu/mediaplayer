import type { BookmarksStore } from "@/stores/bookmarks";
import { mergeProps } from "@base-ui/react";
import { BookmarkCheck, BookmarkIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useBookmarksStore } from "@/stores/bookmarks";
import { usePlayerStore } from "@/stores/player";
import { BookmarksPanel } from "./BookmarksPanel";

export function BookmarkButton() {
  const currentVideo = usePlayerStore(state => state.currentVideo);
  const currentTime = usePlayerStore(state => state.currentTime);
  const addBookmark = useBookmarksStore(state => state.addBookmark);
  const isPanelOpen = useBookmarksStore(state => state.isPanelOpen);
  const setIsPanelOpen = useBookmarksStore(state => state.setIsPanelOpen);
  const lastAction = useBookmarksStore((state: BookmarksStore) => state.lastAction);
  const [animationStatus, setAnimationStatus] = React.useState<"new" | "duplicate" | null>(null);

  React.useEffect(() => {
    if (lastAction && Date.now() - lastAction.timestamp < 100) {
      const type = lastAction.type;
      const startTimer = setTimeout(setAnimationStatus, 0, type);
      const endTimer = setTimeout(setAnimationStatus, 800, null);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    }
    return undefined;
  }, [lastAction]);

  const handleAddBookmark = () => {
    if (currentVideo) {
      addBookmark(currentVideo, currentTime);
    }
  };

  return (
    <Popover onOpenChange={setIsPanelOpen} open={isPanelOpen}>
      <Tooltip>
        <TooltipTrigger
          render={tooltipProps => (
            <PopoverTrigger
              render={popoverProps => (
                <Button
                  {...mergeProps(tooltipProps, popoverProps)}
                  className="group/bookmark-btn relative h-full rounded-none border-0 bg-transparent px-3 text-white shadow-none transition-[colors,transform] duration-200 hover:bg-white/10 active:scale-95 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-inset"
                  disabled={!currentVideo}
                  onClick={(e) => {
                    if (e.button === 0)
                      handleAddBookmark();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setIsPanelOpen(true);
                  }}
                  size="icon"
                  style={{
                    transitionTimingFunction: "var(--ease-out)",
                  }}
                  type="button"
                  variant="ghost"
                >
                  <div className="relative flex items-center justify-center">
                    {animationStatus === "new"
                      ? (
                          <BookmarkCheck
                            className="size-4 animate-pop-spring! text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                            style={{
                              transitionTimingFunction: "var(--ease-out)",
                            }}
                          />
                        )
                      : (
                          <BookmarkIcon
                            className={cn(
                              "size-4 transition-all duration-300 group-hover/bookmark-btn:scale-110",
                              animationStatus === "duplicate" && "animate-recoil! text-amber-400",
                            )}
                            style={{
                              transitionTimingFunction: "var(--ease-out)",
                            }}
                          />
                        )}
                  </div>

                  {/* Feedback Dot */}
                  <div
                    className={cn(
                      "absolute right-1.5 bottom-1.5 size-1 rounded-full bg-white/20 group-hover/bookmark-btn:bg-white/60",
                      "transition-all duration-500 var(--ease-out)",
                      animationStatus === "new" && "scale-[3] bg-emerald-400 opacity-0 duration-300!",
                      animationStatus === "duplicate" && "scale-150 bg-amber-400 duration-200!",
                    )}
                  />

                  {/* Ping Effect */}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 flex items-center justify-center opacity-0",
                      animationStatus === "new" && "animate-ping-once opacity-100",
                    )}
                  >
                    <div className="size-5 rounded-full border border-emerald-400/40" />
                  </div>
                </Button>
              )}
            />
          )}
        />
        <TooltipContent side="top">
          Bookmark
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-52 shadow-xl *:data-[slot=popover-viewport]:p-1.5"
        side="top"
      >
        <BookmarksPanel />
      </PopoverContent>
    </Popover>
  );
}
