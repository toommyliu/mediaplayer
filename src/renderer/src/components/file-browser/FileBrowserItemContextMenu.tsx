import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from "@/components/ui/context-menu";
import {
  libraryCommands,
  playbackCommands,
  queueCommands
} from "@/lib/store";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { FileSystemItem } from "@/types";
import {
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  FolderIcon,
  PlayIcon,
  PlusIcon,
  ListPlusIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

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
          copied ? "-translate-y-full opacity-0 blur-sm" : "translate-y-0 opacity-100 blur-0"
        )}
      >
        <CopyIcon className="size-4" />
        <span>Copy path</span>
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center gap-2 px-1.5 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          copied ? "translate-y-0 opacity-100 blur-0" : "translate-y-full opacity-0 blur-sm"
        )}
      >
        <CheckIcon className="size-4 text-primary" />
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
        void libraryCommands.revealItemInFolder(path);
      }}
    >
      <ExternalLinkIcon className="size-4" />
      {/* TODO: detect OS and change label */}
      Reveal in Finder
    </ContextMenuItem>
  );
}

export interface FileBrowserItemContextMenuProps {
  item: FileSystemItem;
  isExpanded: boolean;
}

// Folder
function FolderItemContextMenu({ item, isExpanded }: FileBrowserItemContextMenuProps) {
  return (
    <>
      <ContextMenuItem
        onClick={() => {
          void libraryCommands.navigateToDirectory(item.path);
        }}
      >
        <FolderOpenIcon className="size-4" />
        Open folder
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          libraryCommands.toggleFolder(item.path);
        }}
      >
        <FolderIcon className="size-4" />
        {isExpanded ? "Collapse folder" : "Expand folder"}
      </ContextMenuItem>
    </>
  )
}

// File
function FileItemContextMenu({ item }: FileBrowserItemContextMenuProps) {
  return <>
    <ContextMenuItem
      onClick={() => {
        playbackCommands.playVideo(item.path);
      }}
    >
      <PlayIcon className="size-4" />
      Play video
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem
      onClick={() => {
        queueCommands.addToQueue({
          duration: item.duration,
          name: item.name,
          path: item.path
        });
      }}
    >
      <PlusIcon className="size-4" />
      Add to queue
    </ContextMenuItem>
    <ContextMenuItem
      onClick={() => {
        queueCommands.addNextToQueue({
          duration: item.duration,
          name: item.name,
          path: item.path
        });
      }}
    >
      <ListPlusIcon className="size-4" />
      Add next
    </ContextMenuItem>
  </>
}

export function FileBrowserItemContextMenu({
  item,
  isExpanded
}: FileBrowserItemContextMenuProps) {
  const isFolder = item.type === "folder";

  return (
    <ContextMenuContent className="min-w-48">
      {isFolder ? (
        <FolderItemContextMenu item={item} isExpanded={isExpanded} />
      ) : (
        <FileItemContextMenu item={item} isExpanded={isExpanded} />
      )}

      <ContextMenuSeparator />
      <RevealInFinderMenuItem path={item.path} />
      <CopyPathMenuItem path={item.path} />
    </ContextMenuContent >
  );
}
