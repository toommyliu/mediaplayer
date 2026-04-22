import type { ComponentProps, KeyboardEvent, MouseEvent } from "react";
import type { FileSystemItem } from "@/types";
import { ChevronDown, Dot, Loader2 } from "lucide-react";

import { navigateToDirectory, toggleFolder } from "@/actions/library";
import { playVideo } from "@/actions/playback";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { makeTimeString } from "@/lib/make-time-string";
import { normalizeVideoPath } from "@/lib/media-path";
import { cn } from "@/lib/utils";
import { useFileBrowserStore } from "@/stores/file-browser";
import { usePlatformStore } from "@/stores/platform";
import { usePlayerStore } from "@/stores/player";
import { useCurrentQueueItem } from "@/stores/queue";
import { useSidebarStore } from "@/stores/sidebar";
import { FileBrowserItemContextMenu } from "./FileBrowserItemContextMenu";

const BACKSLASH_REGEX = /\\/g;
function isCurrentVideo(
  itemPath: string | undefined,
  currentVideo: string | null,
): boolean {
  if (!itemPath || !currentVideo)
    return false;
  return itemPath === normalizeVideoPath(currentVideo).replace(BACKSLASH_REGEX, "/");
}

function hasCurrentVideoInFolder(
  folderPath: string | undefined,
  currentVideo: string | null,
): boolean {
  if (!folderPath || !currentVideo)
    return false;
  return normalizeVideoPath(currentVideo).startsWith(`${folderPath}/`);
}

export function FileBrowserItem({
  item,
  depth,
}: {
  depth: number;
  item: FileSystemItem;
}) {
  const expandedFolders = useFileBrowserStore(state => state.expandedFolders);
  const loadingFolders = useFileBrowserStore(state => state.loadingFolders);
  const isFileBrowserLoading = useFileBrowserStore(state => state.isLoading);
  const currentVideo = usePlayerStore(state => state.currentVideo);
  const setFileBrowserState = useFileBrowserStore(
    state => state.setFileBrowserState,
  );
  const isMac = usePlatformStore(state => state.isMac);
  const currentItem = useCurrentQueueItem();
  const sidebarPosition = useSidebarStore(state => state.position);
  const searchQuery = useFileBrowserStore(state => state.searchQuery);
  const isFolder = item.type === "folder";
  const isExpanded = isFolder && expandedFolders.has(item.path);
  const isLoading = loadingFolders.has(item.path);
  const isPlaying = isCurrentVideo(item.path, currentVideo);
  const containsCurrent
    = isFolder && !isExpanded && hasCurrentVideoInFolder(item.path, currentVideo);

  function focusRelative(offset: number): void {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>("[data-item-trigger='true']"),
    );
    const currentIndex = triggers.findIndex(
      trigger => trigger.dataset.path === item.path,
    );
    const next = triggers[currentIndex + offset];
    next?.focus();
  }

  function handleItemClick(event: MouseEvent | KeyboardEvent): void {
    if (isFileBrowserLoading)
      return;

    if (isFolder) {
      const isModKeyPressed
        = "metaKey" in event ? (isMac ? event.metaKey : event.ctrlKey) : false;

      if (isModKeyPressed) {
        event.preventDefault();
        void navigateToDirectory(item.path);
        return;
      }

      toggleFolder(item.path);
      return;
    }

    if (currentItem?.path === item.path)
      return;
    playVideo(item.path);
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
                  "group relative flex h-7 items-center rounded-md border px-2 transition-all duration-100 focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset",
                  isPlaying
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "hover:bg-muted/50 hover:text-foreground border-transparent",
                  triggerClassName,
                )}
                style={{
                  ...triggerStyle,
                  paddingLeft: `${depth * 14 + 8}px`,
                }}
              >
                <button
                  className="flex h-7 min-w-0 flex-1 items-center gap-2.5 text-left outline-none"
                  data-item-trigger="true"
                  data-path={item.path}
                  onClick={handleItemClick}
                  onFocus={() =>
                    setFileBrowserState({ focusedItemPath: item.path })}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusRelative(1);
                    }
                    else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      focusRelative(-1);
                    }
                    else if (
                      event.key === "ArrowRight"
                      && isFolder
                      && !isExpanded
                    ) {
                      event.preventDefault();
                      toggleFolder(item.path);
                    }
                    else if (
                      event.key === "ArrowLeft"
                      && isFolder
                      && isExpanded
                    ) {
                      event.preventDefault();
                      toggleFolder(item.path);
                    }
                    else if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleItemClick(event);
                    }
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger
                      render={(triggerProps) => {
                        if (!searchQuery) {
                          return (
                            <span
                              {...triggerProps}
                              className="min-w-0 flex-1 truncate text-xs/relaxed font-medium"
                            >
                              {item.name}
                              {isFolder ? "/" : ""}
                            </span>
                          );
                        }

                        const parts = item.name.split(new RegExp(`(${searchQuery})`, "gi"));
                        return (
                          <span
                            {...triggerProps}
                            className="min-w-0 flex-1 truncate text-xs/relaxed font-medium"
                          >
                            {parts.map((part, i) => {
                              const key = `part-${i}-${part}`;
                              return part.toLowerCase() === searchQuery.toLowerCase() ? (
                                <mark key={key} className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">
                                  {part}
                                </mark>
                              ) : (
                                <span key={key}>{part}</span>
                              );
                            })}
                            {isFolder ? "/" : ""}
                          </span>
                        );
                      }}
                    />
                    <TooltipContent
                      align="start"
                      side={sidebarPosition === "left" ? "right" : "left"}
                    >
                      {item.name}
                    </TooltipContent>
                  </Tooltip>

                  {!isFolder
                    ? (
                        <span className="bg-secondary text-secondary-foreground ring-foreground/5 flex h-5 items-center rounded-full px-2 text-[0.625rem] font-medium ring-1 ring-inset">
                          {item.duration ? makeTimeString(item.duration) : "--:--"}
                        </span>
                      )
                    : null}

                  {isLoading
                    ? (
                        <Loader2 className="text-primary size-3.5 animate-spin" />
                      )
                    : null}
                  {containsCurrent
                    ? (
                        <Dot className="text-primary size-4" />
                      )
                    : null}
                  {isFolder
                    ? (
                        <ChevronDown
                          className={cn(
                            "text-muted-foreground size-3.5 transition duration-100",
                            isExpanded ? "rotate-180" : "",
                          )}
                        />
                      )
                    : null}
                </button>
              </div>
            );
          }}
        >
        </ContextMenuTrigger>

        <FileBrowserItemContextMenu item={item} isExpanded={isExpanded} />
      </ContextMenu>
    </div>
  );
}
