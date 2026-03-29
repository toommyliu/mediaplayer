import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent
} from "react";
import { sortFileTree } from "../../../shared";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from "@/components/ui/context-menu";
import {
  ChevronDownIcon,
  CloseIcon,
  DotIcon,
  FilmIcon,
  FolderIcon,
  LoaderIcon,
  PlusIcon,
  RepeatIcon,
  RepeatOneIcon,
  RevealIcon,
  SettingsIcon,
  ShuffleIcon
} from "@/lib/icons";
import { makeTimeString } from "@/lib/make-time-string";
import {
  fileBrowserCommands,
  libraryCommands,
  normalizeVideoPath,
  playbackCommands,
  queueCommands,
  settingsCommands,
  sidebarCommands,
  useCurrentQueueItem,
  useFileBrowserView,
  usePlatformView,
  usePlayerView,
  useQueueView,
  useSidebarView
} from "@/lib/store";
import type { FileSystemItem, QueueItem } from "@/types";

function sidebarButtonClass(active = false): string {
  return active ? "shadow-sm" : "text-muted-foreground";
}

function iconButtonClass(): string {
  return "h-7 px-2 text-xs";
}

function isCurrentVideo(itemPath: string | undefined, currentVideo: string | null): boolean {
  if (!itemPath || !currentVideo) return false;
  return itemPath === normalizeVideoPath(currentVideo).replace(/\\/g, "/");
}

function hasCurrentVideoInFolder(folderPath: string | undefined, currentVideo: string | null): boolean {
  if (!folderPath || !currentVideo) return false;
  return normalizeVideoPath(currentVideo).startsWith(`${folderPath}/`);
}

function FileBrowserItem({
  item,
  depth
}: {
  depth: number;
  item: FileSystemItem;
}) {
  const fileBrowser = useFileBrowserView();
  const player = usePlayerView();
  const platform = usePlatformView();
  const currentItem = useCurrentQueueItem();
  const isFolder = item.type === "folder";
  const isExpanded = isFolder && fileBrowser.expandedFolders.has(item.path);
  const isLoading = fileBrowser.loadingFolders.has(item.path);
  const isPlaying = isCurrentVideo(item.path, player.currentVideo);
  const containsCurrent =
    isFolder &&
    !isExpanded &&
    hasCurrentVideoInFolder(item.path, player.currentVideo);

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

  function handleItemClick(event: ReactMouseEvent | ReactKeyboardEvent): void {
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
        <ContextMenuTrigger render={() => {
            return (
              <div
                className={`group relative flex min-h-[32px] items-center rounded-md border px-2 transition ${
                  isPlaying
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-transparent hover:bg-muted/40"
                }`}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
              >
                <button
                  className="flex min-h-[32px] min-w-0 flex-1 items-center gap-2 text-left outline-none"
                  data-item-trigger="true"
                  data-path={item.path}
                  onClick={handleItemClick}
                  onFocus={() => fileBrowserCommands.setFileBrowserState({ focusedItemPath: item.path })}
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
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {item.duration ? makeTimeString(item.duration) : "--:--"}
                    </span>
                  ) : null}

                  {isLoading ? <LoaderIcon className="h-4 w-4 animate-spin text-primary" /> : null}
                  {containsCurrent ? <DotIcon className="h-3 w-3 text-primary" /> : null}
                  {isFolder ? (
                    <ChevronDownIcon
                      className={`h-4 w-4 text-muted-foreground transition ${isExpanded ? "rotate-180" : ""}`}
                    />
                  ) : null}
                </button>

                <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-1 rounded-md bg-card/90 p-1 shadow group-hover:flex group-focus-within:flex">
                  {isFolder ? (
                    <>
                      <Button
                        className={iconButtonClass()}
                        onClick={(event) => {
                          event.stopPropagation();
                          void libraryCommands.navigateToDirectory(item.path);
                        }}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        Open
                      </Button>
                      <Button
                        className={iconButtonClass()}
                        onClick={(event) => {
                          event.stopPropagation();
                          void libraryCommands.revealItemInFolder(item.path);
                        }}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        <RevealIcon className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className={iconButtonClass()}
                        onClick={(event) => {
                          event.stopPropagation();
                          queueCommands.addToQueue({
                            duration: item.duration,
                            name: item.name,
                            path: item.path
                          });
                        }}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        className={iconButtonClass()}
                        onClick={(event) => {
                          event.stopPropagation();
                          queueCommands.addNextToQueue({
                            duration: item.duration,
                            name: item.name,
                            path: item.path
                          });
                        }}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        Next
                      </Button>
                      <Button
                        className={iconButtonClass()}
                        onClick={(event) => {
                          event.stopPropagation();
                          void libraryCommands.revealItemInFolder(item.path);
                        }}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        <RevealIcon className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
        }}>
      </ContextMenuTrigger>

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

function FileBrowserPanel() {
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

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1 rounded-xl rounded-b-none">
        {fileBrowser.isLoading ? (
          <div className="bg-background/80 absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <LoaderIcon className="h-7 w-7 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          </div>
        ) : null}

        {fileSystem.length === 0 ? (
          <Button
            className="h-full w-full flex-col gap-2 rounded-xl text-center text-muted-foreground"
            onDoubleClick={libraryCommands.resetAndBrowseLibrary}
            type="button"
            variant="ghost"
          >
            <FolderIcon className="h-8 w-8 opacity-60" />
            <div className="text-sm font-medium">No media files loaded</div>
            <div className="text-xs opacity-75">Double-click to browse</div>
          </Button>
        ) : (
          <div
            className="h-full overflow-y-auto"
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
            onScroll={(event) => {
              fileBrowserCommands.setFileBrowserScrollTop(
                (event.target as HTMLDivElement).scrollTop
              );
            }}
            ref={scrollContainerRef}
          >
            <div className="space-y-1">
              {!fileBrowser.isAtRoot && fileBrowser.currentPath ? (
                <Button
                  className="w-full justify-start px-3 py-2 text-left text-sm text-muted-foreground"
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
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-sidebar-border/60 pt-3">
        <div className="flex items-center gap-2">
          <Button
            className={sidebarButtonClass(fileBrowser.sortBy === "name")}
            onClick={() => fileBrowserCommands.setFileBrowserSort("name")}
            type="button"
            variant={fileBrowser.sortBy === "name" ? "secondary" : "ghost"}
          >
            Name
          </Button>
          <Button
            className={sidebarButtonClass(fileBrowser.sortBy === "duration")}
            onClick={() => fileBrowserCommands.setFileBrowserSort("duration")}
            type="button"
            variant={fileBrowser.sortBy === "duration" ? "secondary" : "ghost"}
          >
            Duration
          </Button>
        </div>

        <Button
          className={iconButtonClass()}
          onClick={libraryCommands.resetAndBrowseLibrary}
          size="xs"
          type="button"
          variant="outline"
        >
          Browse
        </Button>
      </div>
    </div>
  );
}

function QueuePanel() {
  const queue = useQueueView();
  const currentItem = useCurrentQueueItem();
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function removeItem(item: QueueItem): void {
    const isCurrent = currentItem?.id === item.id;
    if (!isCurrent) {
      queueCommands.removeFromQueue(item.id);
      return;
    }

    const currentIndex = queue.items.findIndex((queueItem) => queueItem.id === item.id);
    let nextVideoToPlay: string | null = null;

    if (queue.items.length > 1) {
      if (currentIndex < queue.items.length - 1) {
        nextVideoToPlay = queue.items[currentIndex + 1].path;
      } else if (currentIndex > 0) {
        nextVideoToPlay = queue.items[currentIndex - 1].path;
      }
    }

    queueCommands.removeFromQueue(item.id);

    if (nextVideoToPlay) {
      playbackCommands.playVideo(nextVideoToPlay);
    } else {
      playbackCommands.stopPlayback(true);
    }
  }

  const repeatIcon = queue.repeatMode === "one" ? (
      <RepeatOneIcon className="h-4 w-4" />
    ) : (
      <RepeatIcon className="h-4 w-4" />
    );

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {queue.items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-muted-foreground">
            <div>
              <FilmIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm font-medium">No videos in queue</p>
              <p className="text-xs opacity-75">Add videos to start queueing</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {queue.items.map((item, index) => {
              const isPlaying = currentItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`group flex items-center gap-2 rounded-md border p-2 text-sm transition ${
                    dragOverIndex === index
                      ? "border-primary bg-primary/10"
                      : isPlaying
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-transparent hover:bg-muted/40"
                  }`}
                  draggable
                  onClick={() => playbackCommands.playVideo(item.path)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverIndex(index);
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => setDragOverIndex(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromIndex = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
                    if (!Number.isNaN(fromIndex) && fromIndex !== index) {
                      queueCommands.moveQueueItem(fromIndex, index);
                    }
                    setDragOverIndex(null);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.name}</div>
                    {item.duration ? (
                      <div className="text-xs text-muted-foreground">{makeTimeString(item.duration)}</div>
                    ) : null}
                  </div>

                  <Button
                    className="hidden size-7 p-0 text-muted-foreground group-hover:inline-flex hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeItem(item);
                    }}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 border-t border-sidebar-border pt-3">
        <Button
          className={iconButtonClass()}
          onClick={() => queueCommands.shuffleQueue()}
          size="xs"
          type="button"
          variant="outline"
        >
          <ShuffleIcon className="h-4 w-4" />
        </Button>
        <Button
          className={
            queue.repeatMode === "off"
              ? iconButtonClass()
              : "h-7 border-primary/30 bg-primary/10 px-2 text-primary hover:bg-primary/15"
          }
          onClick={() => queueCommands.toggleRepeatMode()}
          size="xs"
          type="button"
          variant={queue.repeatMode === "off" ? "outline" : "secondary"}
        >
          {repeatIcon}
        </Button>
      </div>
    </div>
  );
}

export default function SidebarPanel() {
  const sidebar = useSidebarView();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden px-4 pt-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-sidebar-border bg-sidebar-accent p-1">
          <Button
            className={sidebarButtonClass(sidebar.currentTab === "file-browser")}
            onClick={() => sidebarCommands.setSidebarTab("file-browser")}
            type="button"
            variant={sidebar.currentTab === "file-browser" ? "secondary" : "ghost"}
          >
            Files
          </Button>
          <Button
            className={sidebarButtonClass(sidebar.currentTab === "queue")}
            onClick={() => sidebarCommands.setSidebarTab("queue")}
            type="button"
            variant={sidebar.currentTab === "queue" ? "secondary" : "ghost"}
          >
            Queue
          </Button>
        </div>

        <div className="mt-4 h-[calc(100%-3rem)] overflow-hidden">
          {sidebar.currentTab === "file-browser" ? <FileBrowserPanel /> : <QueuePanel />}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-4 pt-2">
        <button
          className={iconButtonClass()}
          onClick={() => settingsCommands.setSettingsDialogOpen(true)}
          type="button"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>

        <div
          className="group flex cursor-grab items-center justify-center px-2 py-2 active:cursor-grabbing"
          draggable
          onDragEnd={() => sidebarCommands.setSidebarDragging(false)}
          onDragStart={() => sidebarCommands.setSidebarDragging(true)}
        >
          <div className="h-1 w-16 rounded-full bg-border opacity-60 transition group-hover:w-24 group-hover:opacity-100" />
        </div>
      </div>
    </div>
  );
}
