import { Skeleton } from "@/components/ui/skeleton";
import { useFileBrowserStore } from "@/stores/file-browser";
import { sortFileTree } from "../../../../shared/file-tree-utils";
import { FileBrowserEmptyState } from "./FileBrowserEmptyState";
import { FileBrowserHeader } from "./FileBrowserHeader";
import { FileBrowserList } from "./FileBrowserList";

export function FileBrowserPanel() {
  const fileTree = useFileBrowserStore((state) => state.fileTree);
  const sortBy = useFileBrowserStore((state) => state.sortBy);
  const sortDirection = useFileBrowserStore((state) => state.sortDirection);
  const isLoading = useFileBrowserStore((state) => state.isLoading);

  const fileSystem = sortFileTree(fileTree?.files ?? [], {
    sortBy,
    sortDirection,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 pt-1">
      <FileBrowserHeader />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="flex flex-col gap-1 p-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="flex min-h-8 items-center gap-2 rounded-md border border-transparent px-2"
              >
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3 w-10 opacity-50" />
              </div>
            ))}
          </div>
        ) : fileSystem.length === 0 ? (
          <FileBrowserEmptyState />
        ) : (
          <FileBrowserList />
        )}
      </div>
    </div>
  );
}
