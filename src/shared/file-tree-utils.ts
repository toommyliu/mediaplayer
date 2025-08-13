export interface FileTreeItem {
  name: string;
  path: string;
  type: "folder" | "video";
  duration?: number;
  files?: FileTreeItem[];
}

export interface SortOptions {
  sortBy: "name" | "duration";
  sortDirection: "asc" | "desc";
}

/**
 * Extracts a date prefix from a filename (YYYY/MM/DD, YYYY-MM-DD, or YYYY.MM.DD)
 */
function extractDatePrefix(name: string): Date | null {
  const dateMatch = /^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/.exec(name);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    const date = new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10)
    );

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

/**
 * Natural string comparison that handles numbers correctly
 */
function naturalCompare(a: string, b: string): number {
  const chunksA = a.match(/(\d+|\D+)/g) ?? [];
  const chunksB = b.match(/(\d+|\D+)/g) ?? [];

  const maxLength = Math.max(chunksA.length, chunksB.length);

  for (let idx = 0; idx < maxLength; idx++) {
    const chunkA = chunksA[idx] || "";
    const chunkB = chunksB[idx] || "";

    // Compare both chunks as numbers if they're numeric
    if (/^\d+$/.test(chunkA) && /^\d+$/.test(chunkB)) {
      const numA = Number.parseInt(chunkA, 10);
      const numB = Number.parseInt(chunkB, 10);
      if (numA !== numB) {
        return numA - numB;
      }
    } else {
      // Compare as strings
      const result = chunkA.localeCompare(chunkB, undefined, {
        numeric: true,
        sensitivity: "base"
      });
      if (result !== 0) {
        return result;
      }
    }
  }

  return 0;
}

/**
 * Smart name comparison that prioritizes date prefixes and uses natural sorting
 */
function smartNameCompare(a: string, b: string): number {
  const dateA = extractDatePrefix(a);
  const dateB = extractDatePrefix(b);

  // Both have dates?
  if (dateA && dateB) {
    const dateCompare = dateA.getTime() - dateB.getTime();
    if (dateCompare !== 0) {
      return dateCompare;
    }

    // Fallback: compare by the remaining filename
    const restA = a.replace(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})\s*/, "");
    const restB = b.replace(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})\s*/, "");
    return naturalCompare(restA, restB);
  }

  // If only one has a date prefix, prioritize it
  if (dateA && !dateB) return -1;
  if (!dateA && dateB) return 1;

  // If neither has a date prefix, use natural comparison
  return naturalCompare(a, b);
}

/**
 * Sorts an array of FileTreeItem objects according to the specified options
 */
export function sortFileTree(items: FileTreeItem[], options: SortOptions): FileTreeItem[] {
  return [...items].sort((a, b) => {
    const aIsFolder = a.type === "folder";
    const bIsFolder = b.type === "folder";

    // Folders first
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    // Apply sorting based on the selected criteria
    let comparison = 0;

    switch (options.sortBy) {
      case "name": {
        comparison = smartNameCompare(a.name, b.name);
        break;
      }

      case "duration": {
        if (aIsFolder || bIsFolder) {
          // For folders, fall back to name comparison
          comparison = smartNameCompare(a.name, b.name);
        } else {
          const aDuration = a.duration ?? 0;
          const bDuration = b.duration ?? 0;
          comparison = aDuration - bDuration;
        }
        break;
      }

      default:
        comparison = 0;
    }

    // Apply sort direction
    return options.sortDirection === "asc" ? comparison : -comparison;
  });
}

/**
 * Recursively sorts all items in a file tree
 */
export function sortFileTreeRecursive(items: FileTreeItem[], options: SortOptions): FileTreeItem[] {
  const sorted = sortFileTree(items, options);

  return sorted.map((item) => {
    if (item.type === "folder" && item.files) {
      return {
        ...item,
        files: sortFileTreeRecursive(item.files, options)
      };
    }
    return item;
  });
}

/**
 * Flattens a file tree to get all video files recursively
 */
export function flattenVideoFiles(
  items: FileTreeItem[]
): Array<{ name: string; path: string; duration?: number }> {
  const videoFiles: Array<{ name: string; path: string; duration?: number }> = [];

  function flatten(entries: FileTreeItem[]) {
    for (const entry of entries) {
      if (entry.type === "folder" && entry.files) {
        flatten(entry.files);
      } else if (entry.type === "video") {
        videoFiles.push({
          name: entry.name,
          path: entry.path,
          duration: entry.duration
        });
      }
    }
  }

  flatten(items);
  return videoFiles;
}

/**
 * Finds a specific folder in the file tree by path
 */
export function findFolderInTree(items: FileTreeItem[], targetPath: string): FileTreeItem | null {
  for (const item of items) {
    if (item.path === targetPath && item.type === "folder") {
      return item;
    }

    if (item.type === "folder" && item.files) {
      const found = findFolderInTree(item.files, targetPath);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Updates the contents of a specific folder in the file tree
 */
export function updateFolderInTree(
  items: FileTreeItem[],
  targetPath: string,
  newContents: FileTreeItem[]
): FileTreeItem[] {
  return items.map((item) => {
    if (item.path === targetPath && item.type === "folder") {
      return {
        ...item,
        files: newContents
      };
    }

    if (item.type === "folder" && item.files) {
      return {
        ...item,
        files: updateFolderInTree(item.files, targetPath, newContents)
      };
    }

    return item;
  });
}
