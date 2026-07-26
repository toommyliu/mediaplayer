import type { FileTreeItem, SortOptions } from "../../shared";
import { extname } from "node:path";
import { sortFileTree } from "../../shared";
import { VIDEO_EXTENSIONS } from "../../shared/constants";

export interface FileTreeEntry {
  readonly duration?: number;
  readonly files?: ReadonlyArray<FileTreeEntry>;
  readonly modifiedAtMs?: number;
  readonly name: string;
  readonly path: string;
  readonly type: "folder" | "video";
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function isHidden(name: string): boolean {
  return name.startsWith(".");
}

export function isVideoFile(filename: string): boolean {
  const extension = extname(filename).slice(1).toLowerCase();
  return extension.length > 0 && VIDEO_EXTENSIONS.includes(extension);
}

function toFileTreeItem(entry: FileTreeEntry, sortOptions: SortOptions): FileTreeItem {
  return {
    name: entry.name,
    path: normalizePath(entry.path),
    type: entry.type,
    ...(entry.duration === undefined ? {} : { duration: entry.duration }),
    ...(entry.modifiedAtMs === undefined ? {} : { modifiedAtMs: entry.modifiedAtMs }),
    ...(entry.type === "folder"
      ? {
          files: buildSortedFileTree(entry.files ?? [], sortOptions),
        }
      : {}),
  };
}

export function buildSortedFileTree(
  entries: ReadonlyArray<FileTreeEntry>,
  sortOptions: SortOptions,
): FileTreeItem[] {
  return sortFileTree(
    entries.map((entry) => toFileTreeItem(entry, sortOptions)),
    sortOptions,
  );
}
