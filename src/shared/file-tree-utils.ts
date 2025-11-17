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
export function sortFileTree(items: FileTreeItem[], sortOptions: SortOptions): FileTreeItem[] {
  const sorted = [...items].sort((a, b) => {
    let comparison = 0;

    if (sortOptions.sortBy === "duration") {
      const aDuration = a.duration ?? 0;
      const bDuration = b.duration ?? 0;
      comparison = aDuration - bDuration;
    } else {
      comparison = smartNameCompare(a.name, b.name);
    }

    return sortOptions.sortDirection === "desc" ? -comparison : comparison;
  });

  // Recursively sort children and create new objects to avoid mutating the original
  return sorted.map(item => {
    if (item.files) {
      return { ...item, files: sortFileTree(item.files, sortOptions) };
    }
    return item;
  });
}

/**
 * Flattens a file tree into a list of video files
 */
export function flattenVideoFiles(items: FileTreeItem[]): { name: string; path: string; duration?: number }[] {
  const videos: { name: string; path: string; duration?: number }[] = [];

  function traverse(item: FileTreeItem) {
    if (item.type === "video") {
      videos.push({ name: item.name, path: item.path, duration: item.duration });
    } else if (item.files) {
      for (const child of item.files) {
        traverse(child);
      }
    }
  }

  for (const item of items) {
    traverse(item);
  }

  return videos;
}
