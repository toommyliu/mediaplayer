import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from "@/components/ui/context-menu";
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
import {
  navigateToDirectory,
  revealItemInFolder,
  toggleFolder
} from "@/lib/controllers/library-controller";
import { playVideo } from "@/lib/controllers/playback-controller";
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
          copied ? "-translate-y-full opacity-0 blur-sm" : "blur-0 translate-y-0 opacity-100"
        )}
      >
        <CopyIcon className="size-4" />
        <span>Copy path</span>
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center gap-2 px-1.5 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          copied ? "blur-0 translate-y-0 opacity-100" : "translate-y-full opacity-0 blur-sm"
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
  const addQueueItem = useQueueStore((state) => state.addQueueItem);
  const addQueueItemNext = useQueueStore((state) => state.addQueueItemNext);

  return (
    <>
      <ContextMenuItem
        onClick={() => {
          playVideo(item.path);
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
            path: item.path
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
            path: item.path
          });
        }}
      >
        <ListPlusIcon className="size-4" />
        Add next
      </ContextMenuItem>
    </>
  );
}

export function FileBrowserItemContextMenu({ item, isExpanded }: FileBrowserItemContextMenuProps) {
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
    </ContextMenuContent>
  );
}
