import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  libraryCommands,
  fileBrowserCommands,
  useFileBrowserView,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { ArrowDown01, ArrowDownAZ, ArrowUp01, ArrowUpAZ, FolderOpen } from "lucide-react";

export function FileBrowserHeader() {
  const fileBrowser = useFileBrowserView();

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
                  fileBrowser.sortBy === "name"
                    ? "h-7 border-primary/20 bg-primary/5 px-2 text-xs text-primary hover:bg-primary/10"
                    : "border-sidebar-border/60 h-7 px-2 text-xs",
                  "transition-colors"
                )}
                onClick={() => fileBrowserCommands.setFileBrowserSort("name")}
                size="xs"
                type="button"
                variant={fileBrowser.sortBy === "name" ? "secondary" : "outline"}
              >
                {fileBrowser.sortBy === "name" && fileBrowser.sortDirection === "desc" ? (
                  <ArrowUpAZ className="size-3.5" />
                ) : (
                  <ArrowDownAZ className="size-3.5" />
                )}
              </Button>
            )}
          />
          <TooltipContent>
            {fileBrowser.sortBy === "name"
              ? `Sorted by Name (${fileBrowser.sortDirection === 'asc' ? 'Ascending' : 'Descending'})`
              : "Sort by Name"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={(triggerProps) => (
              <Button
                {...triggerProps}
                className={cn(
                  fileBrowser.sortBy === "duration"
                    ? "h-7 border-primary/20 bg-primary/5 px-2 text-xs text-primary hover:bg-primary/10"
                    : "border-sidebar-border/60 h-7 px-2 text-xs",
                  "transition-colors"
                )}
                onClick={() => fileBrowserCommands.setFileBrowserSort("duration")}
                size="xs"
                type="button"
                variant={fileBrowser.sortBy === "duration" ? "secondary" : "outline"}
              >
                {fileBrowser.sortBy === "duration" && fileBrowser.sortDirection === "desc" ? (
                  <ArrowUp01 className="size-3.5" />
                ) : (
                  <ArrowDown01 className="size-3.5" />
                )}
              </Button>
            )}
          />
          <TooltipContent>
            {fileBrowser.sortBy === "duration"
              ? `Sorted by Duration (${fileBrowser.sortDirection === 'asc' ? 'Ascending' : 'Descending'})`
              : "Sort by Duration"}
          </TooltipContent>
        </Tooltip>
      </div>

      <Button
        className={cn("h-7 gap-1.5 px-2 text-xs leading-relaxed border-sidebar-border/60")}
        onClick={libraryCommands.resetAndBrowseLibrary}
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
