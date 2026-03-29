import { Loader } from "lucide-react"
import { sortFileTree } from "../../../../shared/file-tree-utils";

import {
  useFileBrowserView,
} from "@/lib/store";
import { FileBrowserEmptyState } from "./FileBrowserEmptyState";
import { FileBrowserList } from "./FileBrowserList";
import { FileBrowserHeader } from "./FileBrowserHeader";

export function FileBrowserPanel() {
  const fileBrowser = useFileBrowserView();
  const fileSystem = sortFileTree(fileBrowser.fileTree?.files ?? [], {
    sortBy: fileBrowser.sortBy,
    sortDirection: fileBrowser.sortDirection
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 pt-1">
      <FileBrowserHeader />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {fileBrowser.isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader className="h-7 w-7 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          </div>
        ) : null}

        {fileSystem.length === 0 ? (
          <FileBrowserEmptyState />
        ) : (
          <FileBrowserList />
        )}
      </div>
    </div>
  );
}
