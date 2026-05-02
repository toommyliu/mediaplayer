import type { BookmarksStore } from "@/stores/bookmarks";
import { mergeProps } from "@base-ui/react";
import { BookmarkCheck, BookmarkIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useBookmarksStore } from "@/stores/bookmarks";
import { usePlayerStore } from "@/stores/player";
import { BookmarksPanel } from "./BookmarksPanel";

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  }
  else if (ref) {
    ref.current = value;
  }
}

export function BookmarkButton() {
  const currentVideo = usePlayerStore(state => state.currentVideo);
  const currentTime = usePlayerStore(state => state.currentTime);
  const addBookmark = useBookmarksStore(state => state.addBookmark);
  const isPanelOpen = useBookmarksStore(state => state.isPanelOpen);
  const setIsPanelOpen = useBookmarksStore(state => state.setIsPanelOpen);
  const lastAction = useBookmarksStore((state: BookmarksStore) => state.lastAction);
  const [animationStatus, setAnimationStatus] = React.useState<"new" | "duplicate" | null>(null);
  const isBookmarkDisabled = !currentVideo;
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

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
          render={({ ref: tooltipRef, ...tooltipProps }) => (
            <Button
              {...mergeProps(tooltipProps, {
                "aria-label": "Add bookmark",
                "aria-disabled": isBookmarkDisabled,
                "className": cn(
                  "group/bookmark-btn relative h-9 rounded-md border-0 bg-transparent px-3 text-white shadow-none transition-all duration-300 hover:bg-white/10 active:scale-90 focus-visible:ring-1 focus-visible:ring-white/20 sm:h-8",
                  isBookmarkDisabled && "cursor-not-allowed opacity-64 hover:bg-transparent active:scale-100",
                ),
                "onClick": (e: React.MouseEvent<HTMLButtonElement>) => {
                  if (isBookmarkDisabled) {
                    e.preventDefault();
                    return;
                  }
                  if (e.button === 0)
                    handleAddBookmark();
                },
                "onContextMenu": (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  if (isBookmarkDisabled)
                    return;
                  setIsPanelOpen(true);
                },
                "size": "icon" as const,
                "style": {
                  transitionTimingFunction: "var(--ease-out)",
                },
                "type": "button" as const,
                "variant": "ghost" as const,
              })}
              ref={(node) => {
                buttonRef.current = node;
                assignRef(tooltipRef, node);
              }}
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
        <TooltipContent className="text-center" side="top">
          {isBookmarkDisabled
            ? (
                <p>Open a video to add bookmarks</p>
              )
            : (
                <>
                  <p>Add bookmark</p>
                  <p className="text-muted-foreground">Right-click for bookmarks</p>
                </>
              )}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        anchor={buttonRef}
        className="w-52 shadow-xl *:data-[slot=popover-viewport]:p-1.5"
        side="top"
      >
        <BookmarksPanel />
      </PopoverContent>
    </Popover>
  );
}
