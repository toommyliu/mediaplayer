import { useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileBrowserItem } from "./FileBrowserItem";
import { navigateToParent } from "@/lib/controllers/library-controller";
import { sortFileTree } from "../../../../shared/file-tree-utils";
import type { FileSystemItem } from "@/types";
import { useFileBrowserStore } from "@/stores/file-browser";

type FlattenedItem = { type: "back" } | { type: "item"; item: FileSystemItem; depth: number };

function flattenFileTree(
  items: FileSystemItem[],
  expandedFolders: Set<string>,
  depth = 0,
  sortBy: "name" | "duration",
  sortDirection: "asc" | "desc"
): { item: FileSystemItem; depth: number }[] {
  const flattened: { item: FileSystemItem; depth: number }[] = [];
  const sorted = sortFileTree(items, { sortBy, sortDirection });

  for (const item of sorted) {
    flattened.push({ item, depth });
    if (item.type === "folder" && expandedFolders.has(item.path) && item.files) {
      flattened.push(
        ...flattenFileTree(item.files, expandedFolders, depth + 1, sortBy, sortDirection)
      );
    }
  }

  return flattened;
}

export function FileBrowserList() {
  const fileTree = useFileBrowserStore((state) => state.fileTree);
  const expandedFolders = useFileBrowserStore((state) => state.expandedFolders);
  const sortBy = useFileBrowserStore((state) => state.sortBy);
  const sortDirection = useFileBrowserStore((state) => state.sortDirection);
  const isAtRoot = useFileBrowserStore((state) => state.isAtRoot);
  const currentPath = useFileBrowserStore((state) => state.currentPath);
  const scrollTop = useFileBrowserStore((state) => state.scrollTop);
  const setFileBrowserScrollTop = useFileBrowserStore((state) => state.setFileBrowserScrollTop);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const flattenedItems = useMemo(() => {
    const items = flattenFileTree(fileTree?.files ?? [], expandedFolders, 0, sortBy, sortDirection);

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
    overscan: 20
  });

  useEffect(() => {
    if (scrollContainerRef.current && scrollTop > 0) {
      scrollContainerRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop, fileTree]);

  return (
    <ScrollArea
      className="flex-1"
      onScroll={() => {
        setFileBrowserScrollTop(scrollContainerRef.current?.scrollTop ?? 0);
      }}
      scrollFade
      hideScrollbar
      viewportRef={scrollContainerRef}
    >
      <div
        className="relative w-full pr-1"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        onKeyDown={(event) => {
          const triggers = Array.from(
            document.querySelectorAll<HTMLElement>("[data-item-trigger='true']")
          );
          if (triggers.length === 0) return;

          if (event.key === "Home") {
            event.preventDefault();
            triggers[0]?.focus();
          } else if (event.key === "End") {
            event.preventDefault();
            triggers[triggers.length - 1]?.focus();
          }
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = flattenedItems[virtualRow.index];
          if (!row) return null;

          const content =
            row.type === "back" ? (
              <Button
                className="text-muted-foreground hover:bg-muted/40 w-full justify-start px-3 py-2 text-left text-sm"
                onClick={() => {
                  void navigateToParent();
                }}
                type="button"
                variant="ghost"
              >
                ../
              </Button>
            ) : (
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
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {content}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
