import { extname } from "node:path";
import { sortFileTree, type FileTreeItem, type SortOptions } from "../../shared";
import { VIDEO_EXTENSIONS } from "../../shared/constants";

const isHidden = (name: string): boolean => name.startsWith(".");

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function isVideoFile(filename: string): boolean {
  const ext = extname(filename).replace(".", "").toLowerCase();
  return ext ? VIDEO_EXTENSIONS.includes(ext) : false;
}

function createFileTreeItem(
  name: string,
  path: string,
  type: "folder" | "video",
  duration?: number,
  files?: FileTreeItem[]
): FileTreeItem {
  const item: FileTreeItem = {
    name,
    path: normalizePath(path),
    type
  };

  if (type === "video" && duration !== undefined) {
    item.duration = duration;
  }

  if (type === "folder") {
    item.files = files || [];
  }

  return item;
}

function buildSortedFileTree(
  entries: Array<{
    name: string;
    path: string;
    type: "folder" | "video";
    duration?: number;
    files?: Array<{
      name: string;
      path: string;
      type: "folder" | "video";
      duration?: number;
    }>;
  }>,
  sortOptions: SortOptions
): FileTreeItem[] {
  const items: FileTreeItem[] = entries.map((entry) =>
    createFileTreeItem(
      entry.name,
      entry.path,
      entry.type,
      entry.duration,
      entry.files ? buildSortedFileTree(entry.files, sortOptions) : undefined
    )
  );

  return sortFileTree(items, sortOptions);
}

export const FileTree = {
  buildSortedFileTree,
  isHidden,
  isVideoFile,
  normalizePath
} as const;
