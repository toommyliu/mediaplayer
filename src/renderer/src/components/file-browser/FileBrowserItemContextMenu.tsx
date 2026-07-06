import type { FormEvent } from "react";
import type { FileSystemItem, QueueItem } from "@/types";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FolderIcon,
  FolderOpenIcon,
  ListMusicIcon,
  ListPlusIcon,
  PlayIcon,
  PlusIcon,
  TextCursorInputIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  deleteFileBrowserItem,
  navigateToDirectory,
  playFileBrowserVideo,
  renameFileBrowserItem,
  revealItemInFolder,
  toggleFolder,
} from "@/actions/library";
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
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { normalizeVideoPath } from "@/lib/media-path";
import { cn } from "@/lib/utils";
import { useFileBrowserStore } from "@/stores/file-browser";
import { usePlaylistsStore } from "@/stores/playlists";
import { useQueueStore } from "@/stores/queue";
import { makeQueueId } from "@/stores/utils";
import { flattenVideoFiles } from "../../../../shared";

interface CopyPathMenuItemProps {
  path: string;
}

function collectItemsByPath(
  items: FileSystemItem[],
  paths: Set<string>,
  selectedItems: FileSystemItem[] = [],
): FileSystemItem[] {
  for (const item of items) {
    if (paths.has(item.path)) {
      selectedItems.push(item);
    }

    if (item.files) {
      collectItemsByPath(item.files, paths, selectedItems);
    }
  }

  return selectedItems;
}

function toPlaylistItems(items: FileSystemItem[]): QueueItem[] {
  const seenPaths = new Set<string>();
  const playlistItems: QueueItem[] = [];
  const videos = items.flatMap((item) =>
    item.type === "video" ? [item] : flattenVideoFiles([item]),
  );

  for (const video of videos) {
    const normalizedPath = normalizeVideoPath(video.path);
    if (seenPaths.has(normalizedPath)) continue;

    seenPaths.add(normalizedPath);
    playlistItems.push({
      duration: video.duration ?? 0,
      id: makeQueueId(video.path),
      name: video.name,
      path: video.path,
    });
  }

  return playlistItems;
}

function getNewPlaylistItemCount(playlistItems: QueueItem[], existingItems: QueueItem[]): number {
  const existingPaths = new Set(existingItems.map((item) => normalizeVideoPath(item.path)));
  return playlistItems.filter((item) => !existingPaths.has(normalizeVideoPath(item.path))).length;
}

function AddToPlaylistSubMenu({ items }: { items: FileSystemItem[] }) {
  const playlists = usePlaylistsStore((state) => state.playlists);
  const addPlaylistItems = usePlaylistsStore((state) => state.addPlaylistItems);
  const playlistItems = toPlaylistItems(items);
  const hasVideos = playlistItems.length > 0;
  const triggerLabel =
    playlistItems.length > 1 ? `Add ${playlistItems.length} videos to playlist` : "Add to playlist";

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger disabled={!hasVideos}>
        <ListMusicIcon className="size-4" />
        {triggerLabel}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="min-w-52">
        {playlists.length === 0 ? (
          <ContextMenuItem disabled>
            <ListMusicIcon className="size-4" />
            No playlists
          </ContextMenuItem>
        ) : (
          playlists.map((playlist) => {
            const newItemCount = getNewPlaylistItemCount(playlistItems, playlist.items);
            const isAlreadyAdded = hasVideos && newItemCount === 0;

            return (
              <ContextMenuItem
                disabled={isAlreadyAdded}
                key={playlist.id}
                onClick={() => addPlaylistItems(playlist.id, playlistItems)}
              >
                {isAlreadyAdded ? (
                  <CheckIcon className="text-primary size-4" />
                ) : (
                  <ListMusicIcon className="size-4" />
                )}
                <span className="truncate">{playlist.name}</span>
                {isAlreadyAdded ? (
                  <ContextMenuShortcut>Added</ContextMenuShortcut>
                ) : playlistItems.length > 1 ? (
                  <ContextMenuShortcut>{newItemCount} new</ContextMenuShortcut>
                ) : null}
              </ContextMenuItem>
            );
          })
        )}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

function CopyPathMenuItem({ path }: CopyPathMenuItemProps) {
  const { copy, copied } = useCopyToClipboard();

  return (
    <ContextMenuItem
      onClick={(e) => {
        e.preventDefault();
        void copy(path);
      }}
      className="group/copy relative overflow-hidden transition-all active:scale-[0.98]"
    >
      <div
        className={cn(
          "flex items-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          copied ? "-translate-y-full opacity-0 blur-sm" : "blur-0 translate-y-0 opacity-100",
        )}
      >
        <CopyIcon className="size-4" />
        <span>Copy path</span>
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center gap-2 px-1.5 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          copied ? "blur-0 translate-y-0 opacity-100" : "translate-y-full opacity-0 blur-sm",
        )}
      >
        <CheckIcon className="text-primary size-4" />
        <span className="text-primary font-medium">Copied!</span>
      </div>
    </ContextMenuItem>
  );
}

interface RevealInFinderMenuItemProps {
  path: string;
}

function RevealInFinderMenuItem({ path }: RevealInFinderMenuItemProps) {
  return (
    <ContextMenuItem
      onClick={() => {
        void revealItemInFolder(path);
      }}
    >
      <ExternalLinkIcon className="size-4" />
      {/* TODO: detect OS and change label */}
      Reveal in Finder
    </ContextMenuItem>
  );
}

interface RenameMenuItemProps {
  item: FileSystemItem;
  onRename: () => void;
}

function RenameMenuItem({ onRename }: RenameMenuItemProps) {
  return (
    <ContextMenuItem
      onClick={() => {
        onRename();
      }}
    >
      <TextCursorInputIcon className="size-4" />
      Rename
    </ContextMenuItem>
  );
}

interface DeleteMenuItemProps {
  onDelete: () => void;
}

function DeleteMenuItem({ onDelete }: DeleteMenuItemProps) {
  return (
    <ContextMenuItem
      onClick={() => {
        onDelete();
      }}
      variant="destructive"
    >
      <Trash2Icon className="size-4" />
      Move to Trash
    </ContextMenuItem>
  );
}

interface RenameDialogProps {
  item: FileSystemItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function RenameDialog({ item, onOpenChange, open }: RenameDialogProps) {
  const [name, setName] = useState(item.name);
  const [error, setError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setName(item.name);
    setError(null);
    setIsRenaming(false);
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.clearTimeout(focusTimer);
  }, [item.name, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (trimmedName === item.name) {
      onOpenChange(false);
      return;
    }

    setError(null);
    setIsRenaming(true);
    try {
      await renameFileBrowserItem(item, trimmedName);
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Rename failed.");
    } finally {
      setIsRenaming(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-sm p-0" showCloseButton={!isRenaming}>
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Enter a new name for this item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-6 pt-1 pb-6">
            <Input
              aria-invalid={error ? true : undefined}
              disabled={isRenaming}
              nativeInput
              onChange={(event) => setName(event.target.value)}
              ref={inputRef}
              value={name}
            />
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose render={<Button disabled={isRenaming} variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={isRenaming} type="submit">
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

interface DeleteDialogProps {
  item: FileSystemItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function DeleteDialog({ item, onOpenChange, open }: DeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setIsDeleting(false);
  }, [open]);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteFileBrowserItem(item);
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogPopup className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            This will move &quot;
            <span className="text-foreground font-semibold break-all">{item.name}</span>
            &quot; to the Trash and remove it from the library and queue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-destructive px-6 pb-4 text-sm">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button disabled={isDeleting} variant="outline" />}>
            Cancel
          </AlertDialogClose>
          <Button
            disabled={isDeleting}
            onClick={() => {
              void handleDelete();
            }}
            variant="destructive"
          >
            {isDeleting ? "Moving..." : "Move to Trash"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

export interface FileBrowserItemContextMenuProps {
  item: FileSystemItem;
  items?: FileSystemItem[];
  isExpanded: boolean;
}

// Folder
function FolderItemContextMenu({ item, items, isExpanded }: FileBrowserItemContextMenuProps) {
  const playlistItems = items ?? [item];

  return (
    <>
      <ContextMenuItem
        onClick={() => {
          void navigateToDirectory(item.path);
        }}
      >
        <FolderOpenIcon className="size-4" />
        Open folder
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          toggleFolder(item.path);
        }}
      >
        <FolderIcon className="size-4" />
        {isExpanded ? "Collapse folder" : "Expand folder"}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <AddToPlaylistSubMenu items={playlistItems} />
    </>
  );
}

// File
function FileItemContextMenu({ item, items }: FileBrowserItemContextMenuProps) {
  const addQueueItemAtIndex = useQueueStore((state) => state.addQueueItemAtIndex);
  const addQueueItems = useQueueStore((state) => state.addQueueItems);
  const queueIndex = useQueueStore((state) => state.index);
  const playlistItems = items ?? [item];
  const videoItems = toPlaylistItems(playlistItems);
  const addToQueueLabel =
    videoItems.length > 1 ? `Add ${videoItems.length} to queue` : "Add to queue";
  const addNextLabel = videoItems.length > 1 ? `Add ${videoItems.length} next` : "Add next";

  return (
    <>
      <ContextMenuItem
        onClick={() => {
          playFileBrowserVideo(item);
        }}
      >
        <PlayIcon className="size-4" />
        Play video
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => {
          addQueueItems(videoItems);
        }}
      >
        <PlusIcon className="size-4" />
        {addToQueueLabel}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          for (const videoItem of [...videoItems].reverse()) {
            addQueueItemAtIndex(videoItem, queueIndex + 1);
          }
        }}
      >
        <ListPlusIcon className="size-4" />
        {addNextLabel}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <AddToPlaylistSubMenu items={playlistItems} />
    </>
  );
}

export function FileBrowserItemContextMenu({ item, isExpanded }: FileBrowserItemContextMenuProps) {
  const isFolder = item.type === "folder";
  const contextMenuItemPaths = useFileBrowserStore((state) => state.contextMenuItemPaths);
  const fileTree = useFileBrowserStore((state) => state.fileTree);
  const selectedItems =
    contextMenuItemPaths.size > 0 && fileTree
      ? collectItemsByPath(fileTree.files, contextMenuItemPaths)
      : [];
  const contextItems = selectedItems.length > 0 ? selectedItems : [item];
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <ContextMenuContent className="min-w-48">
        {isFolder ? (
          <FolderItemContextMenu item={item} items={contextItems} isExpanded={isExpanded} />
        ) : (
          <FileItemContextMenu item={item} items={contextItems} isExpanded={isExpanded} />
        )}

        <ContextMenuSeparator />
        <RenameMenuItem item={item} onRename={() => setIsRenameOpen(true)} />
        <DeleteMenuItem onDelete={() => setIsDeleteOpen(true)} />
        <RevealInFinderMenuItem path={item.path} />
        <CopyPathMenuItem path={item.path} />
      </ContextMenuContent>
      <RenameDialog item={item} onOpenChange={setIsRenameOpen} open={isRenameOpen} />
      <DeleteDialog item={item} onOpenChange={setIsDeleteOpen} open={isDeleteOpen} />
    </>
  );
}
