import type { FileSystemItem } from "@/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { navigateToParent, resetAndBrowseLibrary, toggleFolder } from "@/actions/library";
import { playVideo } from "@/actions/playback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  searchQuery?: string,
): { item: FileSystemItem; depth: number }[] {
  const flattened: { item: FileSystemItem; depth: number }[] = [];
  const sorted = sortFileTree(items, { sortBy, sortDirection });

  for (const item of sorted) {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (matchesSearch || searchQuery) {
       flattened.push({ item, depth });
    }

    if (
      item.type === "folder"
      && (expandedFolders.has(item.path) || searchQuery)
      && item.files
    ) {
      const childItems = flattenFileTree(
        item.files,
        expandedFolders,
        depth + 1,
        sortBy,
        sortDirection,
        searchQuery,
      );
      flattened.push(...childItems);
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
  const searchQuery = useFileBrowserStore(state => state.searchQuery);
  const setSearchQuery = useFileBrowserStore(state => state.setSearchQuery);
  const setFileBrowserScrollTop = useFileBrowserStore(
    state => state.setFileBrowserScrollTop,
  );
  const sidebarPosition = useSidebarStore(state => state.position);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isSearchFocused && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && isSearchFocused) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchFocused, setSearchQuery]);

  const flattenedItems = useMemo(() => {
    const items = flattenFileTree(
      fileTree?.files ?? [],
      expandedFolders,
      0,
      sortBy,
      sortDirection,
    );

    const result: FlattenedItem[] = [];

    if (!isAtRoot && currentPath && !searchQuery) {
      result.push({ type: "back" });
    }

    for (const item of items) {
      if (!searchQuery || item.item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        result.push({ type: "item", ...item });
      }
    }

    return result;
  }, [fileTree, expandedFolders, sortBy, sortDirection, isAtRoot, currentPath, searchQuery]);

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
    if (scrollContainerRef.current && scrollTop > 0 && !searchQuery) {
      scrollContainerRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop, fileTree, searchQuery]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="px-2 py-2">
        <div className="relative group">
          <Search className={cn(
            "absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground transition-colors duration-200 z-10",
            isSearchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            ref={searchInputRef}
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && flattenedItems.length > 0) {
                const firstItem = flattenedItems.find(item => item.type === "item") as { type: "item"; item: FileSystemItem } | undefined;
                if (firstItem) {
                  if (firstItem.item.type === "folder") {
                    toggleFolder(firstItem.item.path);
                  } else {
                    playVideo(firstItem.item.path);
                  }
                }
              }
              if (e.key === "ArrowDown" && flattenedItems.length > 0) {
                e.preventDefault();
                const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-item-trigger='true']"));
                triggers[0]?.focus();
              }
            }}
            className="h-7 pl-7 pr-7 text-xs bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-input transition-all duration-200 rounded-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-sm transition-colors z-10"
            >
              <X className="size-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

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
