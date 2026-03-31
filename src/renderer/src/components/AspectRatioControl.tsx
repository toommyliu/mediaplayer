import { Expand, Scaling, Shrink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player";

export function AspectRatioControl() {
  const aspectRatio = usePlayerStore(state => state.aspectRatio);
  const setPlayerState = usePlayerStore(state => state.setPlayerState);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DropdownMenuTrigger
              render={(
                <Button
                  className={cn(
                    "h-9 rounded-md border-0 bg-transparent px-3 text-white shadow-none transition-all duration-300 hover:bg-white/10 active:scale-90",
                    "focus-visible:ring-1 focus-visible:ring-white/20 sm:h-8",
                  )}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Scaling className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent side="top">
          <p>Aspect Ratio</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-40" side="top">
        <DropdownMenuRadioGroup
          onValueChange={nextValue =>
            setPlayerState({
              aspectRatio: nextValue as "contain" | "cover" | "fill",
            })}
          value={aspectRatio}
        >
          <DropdownMenuRadioItem value="contain">
            <Shrink className="size-3.5" />
            Contain (Fit)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="cover">
            <Expand className="size-3.5" />
            Cover (Fill)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="fill">
            <Scaling className="size-3.5" />
            Fill (Stretch)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
