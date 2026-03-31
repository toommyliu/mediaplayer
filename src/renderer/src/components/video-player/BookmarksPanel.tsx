import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBookmarksStore } from "@/stores/bookmarks";
import { usePlayerStore } from "@/stores/player";
import { BookmarkItem } from "./BookmarkItem";
import { BookmarksEmptyState } from "./BookmarksEmptyState";

export function BookmarksPanel() {
  const currentVideo = usePlayerStore(state => state.currentVideo);
  const bookmarks = useBookmarksStore(state => state.bookmarks);
  const deleteBookmark = useBookmarksStore(state => state.deleteBookmark);

  const currentVideoBookmarks = useMemo(() => {
    if (!currentVideo)
      return [];
    return bookmarks
      .filter(b => b.videoPath === currentVideo)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [bookmarks, currentVideo]);

  function clearAllBookmarks() {
    currentVideoBookmarks.forEach(b => deleteBookmark(b.id));
  }

  return (
    <div className="flex flex-col gap-1.5 pt-0.5">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 pb-1.5">
        <h2 className="px-1 text-[12px] font-medium text-muted-foreground/60">
          Bookmarks
        </h2>
        {currentVideoBookmarks.length > 0 && (
          <Button
            className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive h-6 px-2 text-[0.625rem]"
            onClick={clearAllBookmarks}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="mr-1 size-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-col max-h-60 min-h-0">
        {currentVideoBookmarks.length === 0
          ? (
              <BookmarksEmptyState />
            )
          : (
              <ScrollArea className="flex-1" hideScrollbar scrollFade>
                <div className="flex flex-col gap-1 px-0.5 py-1">
                  {currentVideoBookmarks.map((bookmark, index) => (
                    <BookmarkItem
                      index={index}
                      item={bookmark}
                      key={bookmark.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
      </div>
    </div>
  );
}
