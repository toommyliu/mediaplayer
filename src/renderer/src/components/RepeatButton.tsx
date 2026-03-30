import { Repeat1, Repeat } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueueStore } from "@/stores/queue";

export function RepeatButton() {
  const repeatMode = useQueueStore((state) => state.repeatMode);
  const toggleRepeatMode = useQueueStore((state) => state.toggleRepeatMode);

  return (
    <Tooltip>
      <TooltipTrigger
        closeOnClick={false}
        render={(props) => (
          <Button
            {...props}
            className={cn(
              repeatMode === "off"
                ? "border-sidebar-border/60 h-7 px-2 text-xs"
                : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 h-7 px-2 text-xs",
              "transition-colors"
            )}
            onClick={toggleRepeatMode}
            size="xs"
            type="button"
            variant={repeatMode === "off" ? "outline" : "secondary"}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="size-3.5" />
            ) : (
              <Repeat className="size-3.5" />
            )}
          </Button>
        )}
      />
      <TooltipContent>
        <div className="w-16 text-center">
          {repeatMode === "one" ? "Repeat one" : repeatMode === "all" ? "Repeat all" : "Repeat off"}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
