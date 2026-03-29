
import type { MouseEvent, KeyboardEvent, ComponentProps } from 'react'
import { ChevronDown, Dot, Loader } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@/components/ui/context-menu";

import { makeTimeString } from "@/lib/make-time-string";
import {
  fileBrowserCommands,
  libraryCommands,
  normalizeVideoPath,
  playbackCommands,
  queueCommands,
  useCurrentQueueItem,
  useFileBrowserView,
  usePlatformView,
  usePlayerView
} from "@/lib/store";
import { cn } from "@/lib/utils";
import type { FileSystemItem } from "@/types";

import { sortFileTree } from "../../../../shared/file-tree-utils";

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
  const isFolder = item.type === "folder";
  const isExpanded = isFolder && fileBrowser.expandedFolders.has(item.path);
  const isLoading = fileBrowser.loadingFolders.has(item.path);
  const isPlaying = isCurrentVideo(item.path, player.currentVideo);
  const containsCurrent =
    isFolder && !isExpanded && hasCurrentVideoInFolder(item.path, player.currentVideo);

  const children = item.files
    ? sortFileTree(item.files, {
      sortBy: fileBrowser.sortBy,
      sortDirection: fileBrowser.sortDirection
    })
    : [];

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

  async function copyItemPath(): Promise<void> {
    try {
      await navigator.clipboard.writeText(item.path);
    } catch (error) {
      console.error("Failed to copy path", error);
    }
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
                className={cn(
                  "group relative flex min-h-[32px] items-center rounded-md border px-2 transition-all duration-200",
                  isPlaying
                    ? "border-primary/20 bg-primary/5 text-primary"
                    : "border-transparent hover:bg-muted/40",
                  triggerClassName
                )}
                style={{
                  ...triggerStyle,
                  paddingLeft: `${depth * 14 + 8}px`
                }}
              >
                <button
                  className="flex min-h-[32px] min-w-0 flex-1 items-center gap-2 text-left outline-none"
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
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {item.name}
                    {isFolder ? "/" : ""}
                  </span>

                  {!isFolder ? (
                    <span className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/80">
                      {item.duration ? makeTimeString(item.duration) : "--:--"}
                    </span>
                  ) : null}

                  {isLoading ? <Loader className="text-primary h-4 w-4 animate-spin" /> : null}
                  {containsCurrent ? <Dot className="text-primary h-3 w-3" /> : null}
                  {isFolder ? (
                    <ChevronDown
                      className={`text-muted-foreground h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`}
                    />
                  ) : null}
                </button>
              </div>
            );
          }}
        ></ContextMenuTrigger>

        <ContextMenuContent>
          {isFolder ? (
            <>
              <ContextMenuItem
                onSelect={() => {
                  void libraryCommands.navigateToDirectory(item.path);
                }}
              >
                Open folder
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  libraryCommands.toggleFolder(item.path);
                }}
              >
                {isExpanded ? "Collapse folder" : "Expand folder"}
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  void libraryCommands.revealItemInFolder(item.path);
                }}
              >
                Reveal in Finder/Explorer
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={copyItemPath}>Copy path</ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem
                onSelect={() => {
                  playbackCommands.playVideo(item.path);
                }}
              >
                Play video
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  queueCommands.addToQueue({
                    duration: item.duration,
                    name: item.name,
                    path: item.path
                  });
                }}
              >
                Add to queue
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  queueCommands.addNextToQueue({
                    duration: item.duration,
                    name: item.name,
                    path: item.path
                  });
                }}
              >
                Add next
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  void libraryCommands.revealItemInFolder(item.path);
                }}
              >
                Reveal in Finder/Explorer
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={copyItemPath}>Copy path</ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {isFolder && isExpanded ? (
        <div className="mt-1 space-y-1">
          {children.map((child) => (
            <div key={child.path}>
              <FileBrowserItem item={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}