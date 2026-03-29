import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { Loader } from "lucide-react"
import { sortFileTree } from "../../../../shared/file-tree-utils";

import {
  fileBrowserCommands,
  libraryCommands,
  useFileBrowserView,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { FileBrowserEmptyState } from "./FileBrowserEmptyState";
import { FileBrowserList } from "./FileBrowserList";

export function FileBrowserPanel() {
  const fileBrowser = useFileBrowserView();
  const fileSystem = sortFileTree(fileBrowser.fileTree?.files ?? [], {
    sortBy: fileBrowser.sortBy,
    sortDirection: fileBrowser.sortDirection
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 pt-1">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <ToggleGroup
          onValueChange={(value) => {
            const first = Array.isArray(value) ? value[0] : value;
            if (first) fileBrowserCommands.setFileBrowserSort(first as 'name' | 'duration');
          }}
          value={[fileBrowser.sortBy] as ('name' | 'duration')[]}
          variant="outline"
        >
          <ToggleGroupItem className="h-7 px-2.5 text-xs" value="name">
            Name
          </ToggleGroupItem>
          <ToggleGroupItem className="h-7 px-2.5 text-xs" value="duration">
            Duration
          </ToggleGroupItem>
        </ToggleGroup>

        <Button
          className={cn("h-7 px-2 text-xs", "border-sidebar-border/60")}
          onClick={libraryCommands.resetAndBrowseLibrary}
          size="xs"
          type="button"
          variant="outline"
        >
          Browse
        </Button>
      </div>

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
