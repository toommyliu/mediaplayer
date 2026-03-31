import { clsx } from "clsx";
import { BookmarkIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBookmarksStore } from "@/stores/bookmarks";
import { usePlayerStore } from "@/stores/player";
import { BookmarksPanel } from "./BookmarksPanel";

export function BookmarkButton() {
  const currentVideo = usePlayerStore(state => state.currentVideo);
  const currentTime = usePlayerStore(state => state.currentTime);
  const addBookmark = useBookmarksStore(state => state.addBookmark);
  const isPanelOpen = useBookmarksStore(state => state.isPanelOpen);
  const setIsPanelOpen = useBookmarksStore(state => state.setIsPanelOpen);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleAddBookmark = () => {
    if (currentVideo) {
      addBookmark(currentVideo, currentTime);
      setIsAnimating(true);
      setTimeout(setIsAnimating, 400, false);
    }
  };

  return (
    <Popover onOpenChange={setIsPanelOpen} open={isPanelOpen}>
      <PopoverTrigger
        render={props => (
          <Button
            {...props}
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
            <BookmarkIcon
              className={clsx(
                "size-4 transition-transform group-hover/bookmark-btn:scale-110",
                isAnimating && "scale-125 duration-150!",
              )}
              style={{
                transitionTimingFunction: "var(--ease-out)",
              }}
            />
            <div
              className={clsx(
                "absolute right-1.5 bottom-1.5 size-0.5 rounded-full bg-white/40 group-hover/bookmark-btn:bg-white/80",
                "transition-[background-color,transform,opacity] duration-300",
                isAnimating && "scale-[4] opacity-0 duration-150!",
              )}
            />
            <div
              className={clsx(
                "pointer-events-none absolute inset-0 flex items-center justify-center opacity-0",
                isAnimating && "animate-ping-once opacity-100",
              )}
            >
              <div className="size-4 rounded-full border border-white/40" />
            </div>
          </Button>
        )}
      />
      <PopoverContent
        className="w-60 shadow-xl *:data-[slot=popover-viewport]:p-1.5"
        side="top"
      >
        <BookmarksPanel />
      </PopoverContent>
    </Popover>
  );
}
