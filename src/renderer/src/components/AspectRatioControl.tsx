import { Shrink, Expand, Scaling } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/menu";
import { playerCommands, usePlayerView } from "@/lib/store";

const controlItemClass =
  "h-full border-0 bg-transparent px-2.5 text-white hover:bg-white/10 rounded-none shadow-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20";

export function AspectRatioControl() {
  const player = usePlayerView();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger>
          <DropdownMenuTrigger>
            <Button className={controlItemClass} size="icon" type="button" variant="ghost">
              <Scaling className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Aspect Ratio</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-40" side="top">
        <DropdownMenuRadioGroup
          onValueChange={(nextValue) =>
            playerCommands.setPlayerState({
              aspectRatio: nextValue as "contain" | "cover" | "fill"
            })
          }
          value={player.aspectRatio}
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
