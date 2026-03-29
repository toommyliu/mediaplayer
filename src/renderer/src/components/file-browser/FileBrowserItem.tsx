
import type { MouseEvent, KeyboardEvent, ComponentProps } from 'react'
import { ChevronDown, Dot, Loader } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuTrigger
} from "@/components/ui/context-menu";

import { makeTimeString } from "@/lib/make-time-string";
import {
  fileBrowserCommands,
  libraryCommands,
  normalizeVideoPath,
  playbackCommands,
  useCurrentQueueItem,
  useFileBrowserView,
  usePlatformView,
  usePlayerView,
  useSidebarView
} from "@/lib/store";
import { FileBrowserItemContextMenu } from "./FileBrowserItemContextMenu";
import { cn } from "@/lib/utils";
import type { FileSystemItem } from "@/types";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";


function isCurrentVideo(itemPath: string | undefined, currentVideo: string | null): boolean {
  if (!itemPath || !currentVideo) return false;
  return itemPath === normalizeVideoPath(currentVideo).replace(/\\/g, "/");
}

function hasCurrentVideoInFolder(
  folderPath: string | undefined,
  currentVideo: string | null
): boolean {
  if (!folderPath || !currentVideo) return false;
  return normalizeVideoPath(currentVideo).startsWith(`${folderPath}/`);
}

export function FileBrowserItem({ item, depth }: { depth: number; item: FileSystemItem }) {
  const fileBrowser = useFileBrowserView();
  const player = usePlayerView();
  const platform = usePlatformView();
  const currentItem = useCurrentQueueItem();
  const sidebar = useSidebarView();
  const isFolder = item.type === "folder";
  const isExpanded = isFolder && fileBrowser.expandedFolders.has(item.path);
  const isLoading = fileBrowser.loadingFolders.has(item.path);
  const isPlaying = isCurrentVideo(item.path, player.currentVideo);
  const containsCurrent =
    isFolder && !isExpanded && hasCurrentVideoInFolder(item.path, player.currentVideo);


  function focusRelative(offset: number): void {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>("[data-item-trigger='true']")
    );
    const currentIndex = triggers.findIndex((trigger) => trigger.dataset.path === item.path);
    const next = triggers[currentIndex + offset];
    next?.focus();
  }

  function handleItemClick(event: MouseEvent | KeyboardEvent): void {
    if (fileBrowser.isLoading) return;

    if (isFolder) {
      const isModKeyPressed =
        "metaKey" in event ? (platform.isMac ? event.metaKey : event.ctrlKey) : false;

      if (isModKeyPressed) {
        event.preventDefault();
        void libraryCommands.navigateToDirectory(item.path);
        return;
      }

      libraryCommands.toggleFolder(item.path);
      return;
    }

    if (currentItem?.path === item.path) return;
    playbackCommands.playVideo(item.path);
  }


  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger
          render={(defaultProps: ComponentProps<"div">) => {
            const {
              className: triggerClassName,
              style: triggerStyle,
              ...triggerProps
            } = defaultProps;

            return (
              <div
                {...triggerProps}
                data-slot="file-browser-item"
                className={cn(
                  "group relative flex h-7 items-center rounded-md border px-2 transition-all duration-100",
                  isPlaying
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-transparent hover:bg-muted/50 hover:text-foreground",
                  triggerClassName
                )}
                style={{
                  ...triggerStyle,
                  paddingLeft: `${depth * 14 + 8}px`
                }}
              >
                <button
                  className="flex h-7 min-w-0 flex-1 items-center gap-2.5 text-left outline-none"
                  data-item-trigger="true"
                  data-path={item.path}
                  onClick={handleItemClick}
                  onFocus={() =>
                    fileBrowserCommands.setFileBrowserState({ focusedItemPath: item.path })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusRelative(1);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      focusRelative(-1);
                    } else if (event.key === "ArrowRight" && isFolder && !isExpanded) {
                      event.preventDefault();
                      libraryCommands.toggleFolder(item.path);
                    } else if (event.key === "ArrowLeft" && isFolder && isExpanded) {
                      event.preventDefault();
                      libraryCommands.toggleFolder(item.path);
                    } else if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleItemClick(event);
                    }
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger
                      render={(triggerProps) => (
                        <span
                          {...triggerProps}
                          className="min-w-0 flex-1 truncate text-xs/relaxed font-medium"
                        >
                          {item.name}
                          {isFolder ? "/" : ""}
                        </span>
                      )}
                    />
                    <TooltipContent
                      align="start"
                      side={sidebar.position === "left" ? "right" : "left"}
                    >
                      {item.name}
                    </TooltipContent>
                  </Tooltip>

                  {!isFolder ? (
                    <span className="flex h-5 items-center rounded-full bg-secondary px-2 text-[0.625rem] font-medium text-secondary-foreground ring-1 ring-inset ring-foreground/5">
                      {item.duration ? makeTimeString(item.duration) : "--:--"}
                    </span>
                  ) : null}

                  {isLoading ? <Loader className="text-primary size-3.5 animate-spin" /> : null}
                  {containsCurrent ? <Dot className="text-primary size-4" /> : null}
                  {isFolder ? (
                    <ChevronDown
                      className={cn("text-muted-foreground size-3.5 transition duration-100", isExpanded ? "rotate-180" : "")}
                    />
                  ) : null}
                </button>
              </div>
            );
          }}
        ></ContextMenuTrigger>

        <FileBrowserItemContextMenu
          item={item}
          isExpanded={isExpanded}
        />
      </ContextMenu>
    </div>
  );
}