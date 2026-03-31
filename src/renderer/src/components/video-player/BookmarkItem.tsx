import type { Bookmark } from "@/lib/contracts";
import { Check, Edit2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  index: number;
  item: Bookmark;
}

export function BookmarkItem({ index, item }: BookmarkItemProps) {
  const deleteBookmark = useBookmarksStore((state) => state.deleteBookmark);
  const updateBookmark = useBookmarksStore((state) => state.updateBookmark);
  const clearLastAddedId = useBookmarksStore((state) => state.clearLastAddedId);
  const lastAddedId = useBookmarksStore((state) => state.lastAddedId);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);

  const [isEditing, setIsEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(item.label || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only auto-edit if it was added in the last 10 seconds
    const isNewEnough = item.createdAt > Date.now() - 10000;
    
    if (lastAddedId === item.id && isNewEnough) {
      const timer = setTimeout(() => {
        setIsEditing(true);
        clearLastAddedId();
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastAddedId, item.id, item.createdAt, clearLastAddedId]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function jumpToBookmark() {
    if (isEditing) return;
    setCurrentTime(item.timestamp);
    const video = getVideoElement();
    if (video) {
      video.currentTime = item.timestamp;
    }
  }

  function handleSave() {
    updateBookmark(item.id, { label: labelValue.trim() || undefined });
    setIsEditing(false);
  }

  function handleCancel() {
    setLabelValue(item.label || "");
    setIsEditing(false);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <div
            {...props}
            className={cn(
              "group/bookmark-item ring-foreground/10 relative flex items-center gap-2.5 rounded-lg px-2 py-1 text-xs/relaxed ring-1 transition-all duration-200 select-none cursor-pointer hover:bg-muted/40",
            )}
            onClick={jumpToBookmark}
            role="button"
            tabIndex={0}
          >
            <span className="text-muted-foreground/60 w-4 text-center text-[0.625rem] font-medium tabular-nums">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Input
                    className="h-6 flex-1 px-1.5 py-0.5 text-xs focus-visible:ring-1 focus-visible:ring-primary/50"
                    onBlur={handleSave}
                    onChange={(e) => setLabelValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") handleCancel();
                    }}
                    ref={inputRef}
                    value={labelValue}
                  />
                  <div className="flex items-center">
                    <Button
                      className="size-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave();
                      }}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <Check className="size-3 text-green-500" />
                    </Button>
                    <Button
                      className="size-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel();
                      }}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <X className="size-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="truncate leading-tight font-medium">
                    {item.label || `Bookmark at ${makeTimeString(item.timestamp)}`}
                  </div>
                  <div className="text-muted-foreground/60 mt-0.5 text-[0.625rem]">
                    {makeTimeString(item.timestamp)}
                  </div>
                </>
              )}
            </div>

            <div className="group-hover/bookmark-item:flex items-center gap-1 hidden">
              {!isEditing && (
                <Button
                  className="text-muted-foreground/60 hover:bg-accent/50 hover:text-foreground size-5 p-0"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsEditing(true);
                  }}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <Edit2 className="size-3" />
                </Button>
              )}
              <Button
                className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive size-5 p-0"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteBookmark(item.id);
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        )}
      />
      <TooltipContent side="right" sideOffset={10}>
        Jump to {makeTimeString(item.timestamp)}
      </TooltipContent>
    </Tooltip>
  );
}
