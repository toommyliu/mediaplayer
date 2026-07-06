import { Volume2 } from "lucide-react";
import { resumeAudioOutput } from "@/audio-output";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useVolumeStore } from "@/stores/volume";

const BOOST_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3] as const;

function formatBoost(boost: number): string {
  return `${boost}×`;
}

export function AudioBoostControl() {
  const boost = useVolumeStore((state) => state.boost);
  const setBoost = useVolumeStore((state) => state.setBoost);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  className={cn(
                    "h-9 min-w-12 rounded-md border-0 bg-transparent px-2 text-xs font-medium text-white shadow-none transition-all duration-300 hover:bg-white/10 active:scale-95",
                    boost > 1 ? "bg-white/10 text-white" : "",
                    "focus-visible:ring-1 focus-visible:ring-white/20 sm:h-8",
                  )}
                  type="button"
                  variant="ghost"
                >
                  <Volume2 className="size-3.5" />
                  <span className="tabular-nums">{formatBoost(boost)}</span>
                </Button>
              }
            />
          }
        />
        <TooltipContent side="top">
          <p>Audio boost</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-36" side="top">
        <DropdownMenuRadioGroup
          onValueChange={(nextValue) => {
            void resumeAudioOutput();
            setBoost(Number(nextValue));
          }}
          value={String(boost)}
        >
          {BOOST_LEVELS.map((level) => (
            <DropdownMenuRadioItem key={level} value={String(level)}>
              <span className="tabular-nums">{formatBoost(level)}</span>
              {level === 1 ? "Normal" : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
