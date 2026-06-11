import type { FormEvent } from "react";
import type { FileSystemItem } from "@/types";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FolderIcon,
  FolderOpenIcon,
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
import { cn } from "@/lib/utils";
import { useQueueStore } from "@/stores/queue";

interface CopyPathMenuItemProps {
  path: string;
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
          copied
            ? "-translate-y-full opacity-0 blur-sm"
            : "blur-0 translate-y-0 opacity-100",
        )}
      >
        <CopyIcon className="size-4" />
        <span>Copy path</span>
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center gap-2 px-1.5 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          copied
            ? "blur-0 translate-y-0 opacity-100"
            : "translate-y-full opacity-0 blur-sm",
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

function RenameDialog({
  item,
  onOpenChange,
  open,
}: RenameDialogProps) {
  const [name, setName] = useState(item.name);
  const [error, setError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open)
      return;

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
    }
    catch (error) {
      setError(error instanceof Error ? error.message : "Rename failed.");
    }
    finally {
      setIsRenaming(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-sm p-0" showCloseButton={!isRenaming}>
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name for this item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-6 pb-6 pt-1">
            <Input
              aria-invalid={error ? true : undefined}
              disabled={isRenaming}
              nativeInput
              onChange={event => setName(event.target.value)}
              ref={inputRef}
              value={name}
            />
            {error
              ? <p className="text-destructive text-sm">{error}</p>
              : null}
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

function DeleteDialog({
  item,
  onOpenChange,
  open,
}: DeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open)
      return;

    setError(null);
    setIsDeleting(false);
  }, [open]);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteFileBrowserItem(item);
      onOpenChange(false);
    }
    catch (error) {
      setError(error instanceof Error ? error.message : "Delete failed.");
    }
    finally {
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
            <span className="font-semibold text-foreground break-all">
              {item.name}
            </span>
            &quot; to the Trash and remove it from the library and queue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error
          ? <p className="text-destructive px-6 pb-4 text-sm">{error}</p>
          : null}
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
  isExpanded: boolean;
}

// Folder
function FolderItemContextMenu({
  item,
  isExpanded,
}: FileBrowserItemContextMenuProps) {
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
    </>
  );
}

// File
function FileItemContextMenu({ item }: FileBrowserItemContextMenuProps) {
  const addQueueItem = useQueueStore(state => state.addQueueItem);
  const addQueueItemNext = useQueueStore(state => state.addQueueItemNext);

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
          addQueueItem({
            duration: item.duration,
            name: item.name,
            path: item.path,
          });
        }}
      >
        <PlusIcon className="size-4" />
        Add to queue
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          addQueueItemNext({
            duration: item.duration,
            name: item.name,
            path: item.path,
          });
        }}
      >
        <ListPlusIcon className="size-4" />
        Add next
      </ContextMenuItem>
    </>
  );
}

export function FileBrowserItemContextMenu({
  item,
  isExpanded,
}: FileBrowserItemContextMenuProps) {
  const isFolder = item.type === "folder";
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <ContextMenuContent className="min-w-48">
        {isFolder
          ? (
              <FolderItemContextMenu item={item} isExpanded={isExpanded} />
            )
          : (
              <FileItemContextMenu item={item} isExpanded={isExpanded} />
            )}

        <ContextMenuSeparator />
        <RenameMenuItem
          item={item}
          onRename={() => setIsRenameOpen(true)}
        />
        <DeleteMenuItem onDelete={() => setIsDeleteOpen(true)} />
        <RevealInFinderMenuItem path={item.path} />
        <CopyPathMenuItem path={item.path} />
      </ContextMenuContent>
      <RenameDialog
        item={item}
        onOpenChange={setIsRenameOpen}
        open={isRenameOpen}
      />
      <DeleteDialog
        item={item}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
      />
    </>
  );
}
