import type { FileSystemItem } from "@/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { navigateToParent, resetAndBrowseLibrary } from "@/actions/library";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { normalizeVideoPath } from "@/lib/media-path";
import { cn } from "@/lib/utils";
import { useFileBrowserStore } from "@/stores/file-browser";
import { usePlayerStore } from "@/stores/player";
import { useSidebarStore } from "@/stores/sidebar";
import { sortFileTree } from "../../../../shared/file-tree-utils";
import { FileBrowserItem } from "./FileBrowserItem";

type FlattenedItem
  = | { type: "back" }
    | { type: "item"; item: FileSystemItem; depth: number };

function flattenFileTree(
  items: FileSystemItem[],
  expandedFolders: Set<string>,
  depth = 0,
  sortBy: "name" | "duration",
  sortDirection: "asc" | "desc",
): { item: FileSystemItem; depth: number }[] {
  const flattened: { item: FileSystemItem; depth: number }[] = [];
  const sorted = sortFileTree(items, { sortBy, sortDirection });

  for (const item of sorted) {
    flattened.push({ item, depth });
    if (
      item.type === "folder"
      && expandedFolders.has(item.path)
      && item.files
    ) {
      flattened.push(
        ...flattenFileTree(
          item.files,
          expandedFolders,
          depth + 1,
          sortBy,
          sortDirection,
        ),
      );
    }
  }

  return flattened;
}

export function FileBrowserList() {
  const fileTree = useFileBrowserStore(state => state.fileTree);
  const expandedFolders = useFileBrowserStore(state => state.expandedFolders);
  const sortBy = useFileBrowserStore(state => state.sortBy);
  const sortDirection = useFileBrowserStore(state => state.sortDirection);
  const isAtRoot = useFileBrowserStore(state => state.isAtRoot);
  const currentPath = useFileBrowserStore(state => state.currentPath);
  const scrollTop = useFileBrowserStore(state => state.scrollTop);
  const setFileBrowserScrollTop = useFileBrowserStore(
    state => state.setFileBrowserScrollTop,
  );
  const sidebarPosition = useSidebarStore(state => state.position);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const flattenedItems = useMemo(() => {
    const items = flattenFileTree(
      fileTree?.files ?? [],
      expandedFolders,
      0,
      sortBy,
      sortDirection,
    );

    const result: FlattenedItem[] = [];

    if (!isAtRoot && currentPath) {
      result.push({ type: "back" });
    }

    for (const item of items) {
      result.push({ type: "item", ...item });
    }

    return result;
  }, [fileTree, expandedFolders, sortBy, sortDirection, isAtRoot, currentPath]);

  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 38,
    overscan: 20,
  });

  const currentVideo = usePlayerStore(state => state.currentVideo);
  const currentVideoIndex = useMemo(() => {
    if (!currentVideo)
      return -1;
    const normalized = normalizeVideoPath(currentVideo).replace(/\\/g, "/");
    return flattenedItems.findIndex(
      row => row.type === "item" && row.item.path === normalized,
    );
  }, [flattenedItems, currentVideo]);

  const virtualItems = virtualizer.getVirtualItems();

  const isAbove = useMemo(() => {
    if (currentVideoIndex === -1 || virtualItems.length === 0)
      return false;
    const item = virtualItems.find(vi => vi.index === currentVideoIndex);
    if (!item)
      return currentVideoIndex < virtualItems[0].index;
    return item.start < virtualizer.scrollOffset - 4;
  }, [currentVideoIndex, virtualItems, virtualizer.scrollOffset]);

  const isBelow = useMemo(() => {
    if (currentVideoIndex === -1 || virtualItems.length === 0)
      return false;
    const item = virtualItems.find(vi => vi.index === currentVideoIndex);
    if (!item)
      return currentVideoIndex > virtualItems.at(-1).index;
    return (
      item.start + item.size
      > virtualizer.scrollOffset + virtualizer.scrollElementSize + 4
    );
  }, [
    currentVideoIndex,
    virtualItems,
    virtualizer.scrollOffset,
    virtualizer.scrollElementSize,
  ]);

  useEffect(() => {
    if (scrollContainerRef.current && scrollTop > 0) {
      scrollContainerRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop, fileTree]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex justify-center border-b overflow-hidden transition-all duration-300 ease-in-out shrink-0",
          isAbove
            ? "h-8 opacity-100"
            : "h-0 opacity-0 pointer-events-none border-none",
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={triggerProps => (
              <Button
                {...triggerProps}
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground h-full w-full rounded-none"
                onClick={() =>
                  virtualizer.scrollToIndex(currentVideoIndex, {
                    align: "center",
                  })}
              >
                <ChevronUp className="size-4" />
              </Button>
            )}
          />
          <TooltipContent align="center" side="bottom">
            Scroll to current video
          </TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea
        className="flex-1"
        onScroll={() => {
          setFileBrowserScrollTop(scrollContainerRef.current?.scrollTop ?? 0);
        }}
        scrollFade
        hideScrollbar
        viewportRef={scrollContainerRef}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) {
            void resetAndBrowseLibrary();
          }
        }}
      >
        <div
          className="relative w-full pr-1"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
          onKeyDown={(event) => {
            const triggers = Array.from(
              document.querySelectorAll<HTMLElement>(
                "[data-item-trigger='true']",
              ),
            );
            if (triggers.length === 0)
              return;

            if (event.key === "Home") {
              event.preventDefault();
              triggers[0]?.focus();
            }
            else if (event.key === "End") {
              event.preventDefault();
              triggers.at(-1)?.focus();
            }
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = flattenedItems[virtualRow.index];
            if (!row)
              return null;

            const content
              = row.type === "back"
                ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={(triggerProps) => (
                          <Button
                            {...triggerProps}
                            className="text-muted-foreground hover:bg-muted/40 focus-visible:ring-inset w-full justify-start px-3 text-left text-xs font-medium"
                            data-item-trigger="true"
                            onClick={() => {
                              void navigateToParent();
                            }}
                            size="xs"
                            variant="ghost"
                          >
                            ../
                          </Button>
                        )}
                      />
                      <TooltipContent
                        align="start"
                        side={sidebarPosition === "left" ? "right" : "left"}
                      >
                        Go back
                      </TooltipContent>
                    </Tooltip>
                  )
                : (
                    <FileBrowserItem item={row.item} depth={row.depth} />
                  );

            return (
              <div
                key={virtualRow.key}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className="pb-1"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {content}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div
        className={cn(
          "flex justify-center border-t overflow-hidden transition-all duration-300 ease-in-out shrink-0",
          isBelow
            ? "h-8 opacity-100"
            : "h-0 opacity-0 pointer-events-none border-none",
        )}
       >
        <Tooltip>
          <TooltipTrigger
            render={triggerProps => (
              <Button
                {...triggerProps}
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground h-full w-full rounded-none"
                onClick={() =>
                  virtualizer.scrollToIndex(currentVideoIndex, {
                    align: "center",
                  })}
              >
                <ChevronDown className="size-4" />
              </Button>
            )}
          />
          <TooltipContent align="center" side="top">
            Scroll to current video
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
