import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useQueueStore } from "@/stores/queue";

export function ClearQueueButton() {
  const resetQueue = useQueueStore((state) => state.resetQueue);

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Button
            {...props}
            className={cn("h-7 px-2 text-xs", "border-sidebar-border/60")}
            onClick={resetQueue}
            size="xs"
            type="button"
            variant="outline"
          >
            Clear
          </Button>
        )}
      />
      <TooltipContent>Clear queue</TooltipContent>
    </Tooltip>
  );
}
