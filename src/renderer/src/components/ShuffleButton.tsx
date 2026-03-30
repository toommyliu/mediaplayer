import { Shuffle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueueStore } from "@stores/queue";

export function ShuffleButton() {
  const shuffleQueue = useQueueStore((state) => state.shuffleQueue);

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Button
            {...props}
            className={cn("border-sidebar-border/60 h-7 px-2 text-xs")}
            onClick={shuffleQueue}
            size="xs"
            type="button"
            variant="outline"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
        )}
      />
      <TooltipContent>Shuffle</TooltipContent>
    </Tooltip>
  );
}
