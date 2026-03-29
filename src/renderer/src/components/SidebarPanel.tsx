import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent
} from "react";
import { sortFileTree } from "../../../shared";
import { Button } from "@/components/ui/button";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from "@/components/ui/context-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import {
  ChevronDownIcon,
  CloseIcon,
  DotIcon,
  FilmIcon,
  FolderIcon,
  LoaderIcon,
  RepeatIcon,
  RepeatOneIcon,
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
import { cn } from "@/lib/utils";
import type { FileSystemItem, QueueItem } from "@/types";
import { ShuffleButton } from "./ShuffleButton";
import { RepeatButton } from "./RepeatButton";
import { ClearQueueButton } from "./ClearQueueButton";

function iconButtonClass(): string {
  return "h-7 px-2 text-xs";
}

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

function FileBrowserItem({ item, depth }: { depth: number; item: FileSystemItem }) {
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

                  {isLoading ? <LoaderIcon className="text-primary h-4 w-4 animate-spin" /> : null}
                  {containsCurrent ? <DotIcon className="text-primary h-3 w-3" /> : null}
                  {isFolder ? (
                    <ChevronDownIcon
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
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <ToggleGroup
          onValueChange={(value) => {
            const first = Array.isArray(value) ? value[0] : value;
            if (first) fileBrowserCommands.setFileBrowserSort(first as 'name' | 'duration');
          }}
          value={[fileBrowser.sortBy] as ('name' | 'duration')[]}
          variant="outline"
        >
          <ToggleGroupItem className="h-7 px-2.5 text-xs" value="name">
            Name
          </ToggleGroupItem>
          <ToggleGroupItem className="h-7 px-2.5 text-xs" value="duration">
            Duration
          </ToggleGroupItem>
        </ToggleGroup>

        <Button
          className={cn(iconButtonClass(), "border-sidebar-border/60")}
          onClick={libraryCommands.resetAndBrowseLibrary}
          size="xs"
          type="button"
          variant="outline"
        >
          Browse
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {fileBrowser.isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <LoaderIcon className="h-7 w-7 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          </div>
        ) : null}

        {fileSystem.length === 0 ? (
          <Empty className="h-full py-0">
            <EmptyMedia variant="icon">
              <FolderIcon className="size-6 text-muted-foreground/60" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle className="text-base font-medium">No media loaded</EmptyTitle>
              <EmptyDescription className="text-xs">
                Browse your folders to add media files to the library.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              className="mt-2 h-8 px-4 text-xs"
              onClick={libraryCommands.resetAndBrowseLibrary}
              variant="outline"
            >
              Browse Files
            </Button>
          </Empty>
        ) : (
          <ScrollArea
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
        )}
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShuffleButton />
          <RepeatButton />
        </div>

        <ClearQueueButton />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {queue.items.length === 0 ? (
          <Empty className="h-full py-0">
            <EmptyMedia variant="icon">
              <FilmIcon className="size-6 text-muted-foreground/60" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle className="text-base font-medium">Queue is empty</EmptyTitle>
              <EmptyDescription className="text-xs">
                Add videos to your queue to watch them sequentially.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="flex-1" scrollFade>
            <div className="pr-1">
              <div className="space-y-1">
                {queue.items.map((item, index) => {
                  const isPlaying = currentItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group flex items-center gap-3 rounded-md border p-2 text-sm transition-all duration-200",
                        {
                          "border-primary bg-primary/10": dragOverIndex === index,
                          "border-primary/20 bg-primary/5 text-primary": isPlaying,
                          "border-transparent hover:bg-muted/40":
                            dragOverIndex !== index && !isPlaying
                        }
                      )}
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
                        const fromIndex = Number.parseInt(
                          event.dataTransfer.getData("text/plain"),
                          10
                        );
                        if (!Number.isNaN(fromIndex) && fromIndex !== index) {
                          queueCommands.moveQueueItem(fromIndex, index);
                        }
                        setDragOverIndex(null);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="w-4 text-center text-[10px] font-medium text-muted-foreground/60 tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium leading-tight">{item.name}</div>
                        {item.duration ? (
                          <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                            {makeTimeString(item.duration)}
                          </div>
                        ) : null}
                      </div>

                      <Button
                        className="hidden size-6 p-0 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive group-hover:inline-flex"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeItem(item);
                        }}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

export default function SidebarPanel() {
  const sidebar = useSidebarView();

  return (
    <Tabs
      className="flex h-full flex-col overflow-hidden"
      onValueChange={(value) => sidebarCommands.setSidebarTab(value as any)}
      value={sidebar.currentTab}
    >
      <SidebarHeader className="px-4 pb-1 pt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file-browser">Files</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 px-4 pt-0">
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="file-browser">
          <FileBrowserPanel />
        </TabsContent>
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="queue">
          <QueuePanel />
        </TabsContent>
      </SidebarContent>

      <SidebarFooter className="px-4 pt-2 pb-4">
        <div className="flex items-center justify-between gap-2">
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
            <div className="bg-border h-1 w-16 rounded-full opacity-60 transition group-hover:w-24 group-hover:opacity-100" />
          </div>
        </div>
      </SidebarFooter>
    </Tabs>
  );
}
