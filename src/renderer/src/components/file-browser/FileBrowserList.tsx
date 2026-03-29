import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { FileBrowserItem } from "./FileBrowserItem";

import { fileBrowserCommands, libraryCommands, useFileBrowserView } from "@/lib/store";
import { sortFileTree } from '../../../../shared/file-tree-utils';

export function FileBrowserList() {
  const fileBrowser = useFileBrowserView();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fileSystem = sortFileTree(fileBrowser.fileTree?.files ?? [], {
    sortBy: fileBrowser.sortBy,
    sortDirection: fileBrowser.sortDirection
  });

  useEffect(() => {
    if (scrollContainerRef.current && fileBrowser.scrollTop > 0) {
      scrollContainerRef.current.scrollTop = fileBrowser.scrollTop;
    }
  }, [fileBrowser.scrollTop, fileBrowser.fileTree]);

  return <ScrollArea
    className="flex-1"
    onScroll={() => {
      fileBrowserCommands.setFileBrowserScrollTop(
        scrollContainerRef.current?.scrollTop ?? 0
      );
    }}
    scrollFade
    viewportRef={scrollContainerRef}
  >
    <div
      className="pr-1"
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
      <div className="space-y-1">
        {!fileBrowser.isAtRoot && fileBrowser.currentPath ? (
          <Button
            className="w-full justify-start px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/40"
            onClick={() => {
              void libraryCommands.navigateToParent();
            }}
            type="button"
            variant="ghost"
          >
            ../
          </Button>
        ) : null}

        {fileSystem.map((item) => (
          <div key={item.path}>
            <FileBrowserItem item={item} depth={0} />
          </div>
        ))}
      </div>
    </div>
  </ScrollArea>
}