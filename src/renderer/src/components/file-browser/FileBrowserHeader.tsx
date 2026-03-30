import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowDown01, ArrowDownAZ, ArrowUp01, ArrowUpAZ, FolderOpen } from "lucide-react";
import { resetAndBrowseLibrary } from "@/lib/controllers/library-controller";
import { useFileBrowserStore } from "@/stores/file-browser";

export function FileBrowserHeader() {
  const sortBy = useFileBrowserStore((state) => state.sortBy);
  const sortDirection = useFileBrowserStore((state) => state.sortDirection);
  const setFileBrowserSort = useFileBrowserStore((state) => state.setFileBrowserSort);

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-2"
      data-slot="file-browser-header"
    >
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={(triggerProps) => (
              <Button
                {...triggerProps}
                className={cn(
                  sortBy === "name"
                    ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 h-7 px-2 text-xs"
                    : "border-sidebar-border/60 h-7 px-2 text-xs",
                  "transition-colors"
                )}
                onClick={() => setFileBrowserSort("name")}
                size="xs"
                type="button"
                variant={sortBy === "name" ? "secondary" : "outline"}
              >
                {sortBy === "name" && sortDirection === "desc" ? (
                  <ArrowUpAZ className="size-3.5" />
                ) : (
                  <ArrowDownAZ className="size-3.5" />
                )}
              </Button>
            )}
          />
          <TooltipContent>
            {sortBy === "name"
              ? `Sorted by Name (${sortDirection === "asc" ? "Ascending" : "Descending"})`
              : "Sort by Name"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={(triggerProps) => (
              <Button
                {...triggerProps}
                className={cn(
                  sortBy === "duration"
                    ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 h-7 px-2 text-xs"
                    : "border-sidebar-border/60 h-7 px-2 text-xs",
                  "transition-colors"
                )}
                onClick={() => setFileBrowserSort("duration")}
                size="xs"
                type="button"
                variant={sortBy === "duration" ? "secondary" : "outline"}
              >
                {sortBy === "duration" && sortDirection === "desc" ? (
                  <ArrowUp01 className="size-3.5" />
                ) : (
                  <ArrowDown01 className="size-3.5" />
                )}
              </Button>
            )}
          />
          <TooltipContent>
            {sortBy === "duration"
              ? `Sorted by Duration (${sortDirection === "asc" ? "Ascending" : "Descending"})`
              : "Sort by Duration"}
          </TooltipContent>
        </Tooltip>
      </div>

      <Button
        className={cn("border-sidebar-border/60 h-7 gap-1.5 px-2 text-xs leading-relaxed")}
        onClick={resetAndBrowseLibrary}
        size="xs"
        type="button"
        variant="outline"
      >
        <FolderOpen className="size-3.5" />
        <span>Browse</span>
      </Button>
    </div>
  );
}
