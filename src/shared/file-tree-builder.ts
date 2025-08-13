/**
 * Shared file tree building utilities for organizing directory contents
 */

import { VIDEO_EXTENSIONS } from "./constants";
import { sortFileTreeRecursive, type FileTreeItem, type SortOptions } from "./file-tree-utils";

/**
 * Checks if a file has a supported video extension
 */
export function isVideoFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? VIDEO_EXTENSIONS.includes(ext) : false;
}

/**
 * Transforms a raw directory entry into a FileTreeItem
 */
export function createFileTreeItem(
  name: string,
  path: string,
  type: "folder" | "video",
  duration?: number,
  files?: FileTreeItem[]
): FileTreeItem {
  const item: FileTreeItem = {
    name,
    path,
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

/**
 * Builds a sorted file tree from directory contents
 * This function should be called by the backend to create consistent file trees
 */
export function buildSortedFileTree(
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

  return sortFileTreeRecursive(items, sortOptions);
}

/**
 * Creates a minimal file tree structure for single file selections
 */
export function createSingleFileTree(filePath: string, duration: number = 0): FileTreeItem[] {
  const name = filePath.split("/").pop() || filePath.split("\\").pop() || "Unknown";

  return [createFileTreeItem(name, filePath, "video", duration)];
}
