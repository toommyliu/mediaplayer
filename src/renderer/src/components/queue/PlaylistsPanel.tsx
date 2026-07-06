import type { ReactNode } from "react";
import type { Playlist, QueueItem } from "@/types";
import {
  ListMusicIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  TextCursorInputIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { playVideo } from "@/actions/playback";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { makeTimeString } from "@/lib/make-time-string";
import { cn } from "@/lib/utils";
import { usePlaylistsStore } from "@/stores/playlists";
import { useQueueStore } from "@/stores/queue";
import { PlaylistNameDialog } from "./PlaylistNameDialog";

const PLAYLIST_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

function formatPlaylistDate(timestamp: number): string {
  return PLAYLIST_DATE_FORMATTER.format(new Date(timestamp));
}

function formatItemCount(count: number): string {
  return `${count} ${count === 1 ? "video" : "videos"}`;
}

function getPlaylistDuration(playlist: Playlist): number {
  return playlist.items.reduce((total, item) => {
    return total + (item.duration && item.duration > 0 ? item.duration : 0);
  }, 0);
}

function formatPlaylistSummary(playlist: Playlist): string {
  const duration = getPlaylistDuration(playlist);
  const parts = [formatItemCount(playlist.items.length)];

  if (duration > 0) {
    parts.push(makeTimeString(duration));
  }

  return parts.join(" - ");
}

function makeDefaultPlaylistName(): string {
  return `Playlist ${formatPlaylistDate(Date.now())}`;
}

function PlaylistIconButton({
  children,
  className,
  disabled,
  onClick,
  tooltip,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className={cn(
              "size-6 rounded-md text-muted-foreground/70 hover:bg-primary/10 hover:text-primary",
              className,
            )}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function PlaylistItemRow({
  index,
  item,
  onPlay,
  onRemove,
}: {
  index: number;
  item: QueueItem;
  onPlay: () => void;
  onRemove: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className="group/playlist-item hover:bg-muted/50 flex h-9 min-w-0 items-center gap-2 rounded-md px-2 text-left transition-colors"
            onClick={onPlay}
            role="button"
            tabIndex={0}
          >
            <span className="text-muted-foreground/60 w-4 shrink-0 text-center text-[0.625rem] font-medium tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs leading-tight font-medium">{item.name}</div>
              {item.duration ? (
                <div className="text-muted-foreground/60 mt-0.5 text-[0.625rem]">
                  {makeTimeString(item.duration)}
                </div>
              ) : null}
            </div>
            <Button
              className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive hidden size-5 p-0 group-focus-within/playlist-item:inline-flex group-hover/playlist-item:inline-flex"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <XIcon className="size-3" />
            </Button>
          </div>
        }
      />
      <TooltipContent side="right" sideOffset={10}>
        {item.name}
      </TooltipContent>
    </Tooltip>
  );
}

export function PlaylistsPanel() {
  const playlists = usePlaylistsStore((state) => state.playlists);
  const createPlaylist = usePlaylistsStore((state) => state.createPlaylist);
  const deletePlaylist = usePlaylistsStore((state) => state.deletePlaylist);
  const removePlaylistItem = usePlaylistsStore((state) => state.removePlaylistItem);
  const renamePlaylist = usePlaylistsStore((state) => state.renamePlaylist);
  const replacePlaylistItems = usePlaylistsStore((state) => state.replacePlaylistItems);
  const touchPlaylist = usePlaylistsStore((state) => state.touchPlaylist);
  const queueItems = useQueueStore((state) => state.items);
  const setQueueItems = useQueueStore((state) => state.setQueueItems);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingPlaylist, setDeletingPlaylist] = useState<Playlist | null>(null);
  const [renamingPlaylist, setRenamingPlaylist] = useState<Playlist | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const sortedPlaylists = useMemo(
    () =>
      [...playlists].sort((a, b) => {
        const aTime = a.lastPlayedAt ?? a.updatedAt;
        const bTime = b.lastPlayedAt ?? b.updatedAt;
        return bTime - aTime;
      }),
    [playlists],
  );
  const selectedPlaylist =
    sortedPlaylists.find((playlist) => playlist.id === selectedPlaylistId) ??
    sortedPlaylists[0] ??
    null;
  const canSaveQueue = queueItems.length > 0;
  const canLoadSelected = Boolean(selectedPlaylist);
  const canPlaySelected = Boolean(selectedPlaylist?.items.length);

  function loadPlaylist(playlist: Playlist, index = 0): void {
    setQueueItems(playlist.items, index);
    touchPlaylist(playlist.id);
  }

  function playPlaylist(playlist: Playlist, index = 0): void {
    const item = playlist.items[index];
    if (!item) return;

    loadPlaylist(playlist, index);
    playVideo(item.path);
  }

  function deleteSelectedPlaylist(playlist: Playlist): void {
    const wasSelected = selectedPlaylist?.id === playlist.id;
    deletePlaylist(playlist.id);

    if (wasSelected) {
      setSelectedPlaylistId(null);
    }
  }

  function removeSelectedPlaylistItem(item: QueueItem): void {
    if (!selectedPlaylist) return;

    removePlaylistItem(selectedPlaylist.id, item.id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 pt-1">
      <div className="flex shrink-0 justify-end">
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className="h-7 px-2 text-xs"
                  onClick={() => setIsCreateOpen(true)}
                  size="xs"
                  type="button"
                  variant="outline"
                >
                  <PlusIcon className="size-3.5" />
                  New
                </Button>
              }
            />
            <TooltipContent>Create playlist</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {sortedPlaylists.length === 0 ? (
        <div className="border-sidebar-border/60 flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center">
          <div className="max-w-48 space-y-3">
            <ListMusicIcon className="text-muted-foreground/50 mx-auto size-8" />
            <div>
              <div className="text-sm font-medium">No playlists</div>
              <div className="text-muted-foreground mt-1 text-xs">
                Create one here, then add videos from the file browser.
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => setIsCreateOpen(true)}
              size="xs"
              type="button"
            >
              <PlusIcon className="size-3.5" />
              New Playlist
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="max-h-48 shrink-0" hideScrollbar scrollFade>
            <div className="flex flex-col gap-1 pr-1">
              {sortedPlaylists.map((playlist) => (
                <div
                  aria-selected={selectedPlaylist?.id === playlist.id}
                  className={cn(
                    "group/playlist flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                    selectedPlaylist?.id === playlist.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/70",
                  )}
                  key={playlist.id}
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedPlaylistId(playlist.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs leading-tight font-medium">
                      {playlist.name}
                    </div>
                    <div className="text-muted-foreground/70 mt-0.5 truncate text-[0.625rem]">
                      {formatPlaylistSummary(playlist)}
                      {" - "}
                      {formatPlaylistDate(playlist.lastPlayedAt ?? playlist.updatedAt)}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/playlist:opacity-100 group-hover/playlist:opacity-100 group-focus-visible/playlist:opacity-100">
                    <PlaylistIconButton
                      disabled={playlist.items.length === 0}
                      onClick={() => playPlaylist(playlist)}
                      tooltip="Play from top"
                    >
                      <PlayIcon className="size-3.5" />
                    </PlaylistIconButton>

                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <DropdownMenuTrigger
                              className="text-muted-foreground/70 hover:bg-primary/10 hover:text-primary inline-flex size-6 items-center justify-center rounded-md"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontalIcon className="size-3.5" />
                            </DropdownMenuTrigger>
                          }
                        />
                        <TooltipContent>Playlist actions</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem onClick={() => loadPlaylist(playlist)}>
                          <ListMusicIcon className="size-4" />
                          Replace queue
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={playlist.items.length === 0}
                          onClick={() => playPlaylist(playlist)}
                        >
                          <PlayIcon className="size-4" />
                          Play now
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setRenamingPlaylist(playlist)}>
                          <TextCursorInputIcon className="size-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!canSaveQueue}
                          onClick={() => replacePlaylistItems(playlist.id, queueItems)}
                        >
                          <RefreshCwIcon className="size-4" />
                          Replace with queue
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingPlaylist(playlist)}
                          variant="destructive"
                        >
                          <Trash2Icon className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-sidebar-border/60 flex min-h-0 flex-1 flex-col border-t pt-2">
            {selectedPlaylist ? (
              <>
                <div className="flex shrink-0 items-start justify-between gap-2 pb-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{selectedPlaylist.name}</div>
                    <div className="text-muted-foreground/70 mt-0.5 text-[0.625rem]">
                      {formatPlaylistSummary(selectedPlaylist)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <PlaylistIconButton
                      disabled={!canLoadSelected}
                      onClick={() => loadPlaylist(selectedPlaylist)}
                      tooltip="Replace queue"
                    >
                      <ListMusicIcon className="size-3.5" />
                    </PlaylistIconButton>
                    <PlaylistIconButton
                      disabled={!canPlaySelected}
                      onClick={() => playPlaylist(selectedPlaylist)}
                      tooltip="Play from top"
                    >
                      <PlayIcon className="size-3.5" />
                    </PlaylistIconButton>
                  </div>
                </div>

                {selectedPlaylist.items.length === 0 ? (
                  <div className="border-sidebar-border/60 text-muted-foreground flex min-h-0 flex-1 items-center justify-center rounded-md border border-dashed px-4 py-8 text-center text-xs">
                    Add videos from the file browser context menu.
                  </div>
                ) : (
                  <ScrollArea className="min-h-0 flex-1" hideScrollbar scrollFade>
                    <div className="flex flex-col gap-1 pr-1">
                      {selectedPlaylist.items.map((item, index) => (
                        <PlaylistItemRow
                          index={index}
                          item={item}
                          key={item.id}
                          onPlay={() => playPlaylist(selectedPlaylist, index)}
                          onRemove={() => removeSelectedPlaylistItem(item)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            ) : null}
          </div>
        </>
      )}

      {isCreateOpen ? (
        <PlaylistNameDialog
          defaultName={makeDefaultPlaylistName()}
          description="Create an empty playlist and add videos later."
          onOpenChange={setIsCreateOpen}
          onSubmit={(name) => {
            const playlist = createPlaylist(name, []);
            setSelectedPlaylistId(playlist?.id ?? null);
          }}
          open={isCreateOpen}
          submitLabel="Create"
          title="New Playlist"
        />
      ) : null}
      {deletingPlaylist ? (
        <AlertDialog
          onOpenChange={(open) => {
            if (!open) {
              setDeletingPlaylist(null);
            }
          }}
          open={Boolean(deletingPlaylist)}
        >
          <AlertDialogPopup className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete playlist?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete &quot;
                <span className="text-foreground font-semibold break-all">
                  {deletingPlaylist.name}
                </span>
                &quot;. The video files will not be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
              <Button
                onClick={() => {
                  deleteSelectedPlaylist(deletingPlaylist);
                  setDeletingPlaylist(null);
                }}
                variant="destructive"
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      ) : null}
      {renamingPlaylist ? (
        <PlaylistNameDialog
          key={renamingPlaylist.id}
          defaultName={renamingPlaylist.name}
          description="Give this playlist a new name."
          onOpenChange={(open) => {
            if (!open) {
              setRenamingPlaylist(null);
            }
          }}
          onSubmit={(name) => renamePlaylist(renamingPlaylist.id, name)}
          open={Boolean(renamingPlaylist)}
          submitLabel="Rename"
          title="Rename Playlist"
        />
      ) : null}
    </div>
  );
}
