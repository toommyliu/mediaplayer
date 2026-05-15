import { Gauge } from "lucide-react";
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
import { PLAYBACK_RATES, usePlayerStore } from "@/stores/player";

function formatPlaybackRate(rate: number): string {
  return `${rate}×`;
}

export function PlaybackSpeedControl() {
  const playbackRate = usePlayerStore(state => state.playbackRate);
  const setPlaybackRate = usePlayerStore(state => state.setPlaybackRate);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DropdownMenuTrigger
              render={(
                <Button
                  className={cn(
                    "h-9 min-w-12 rounded-md border-0 bg-transparent px-2 text-xs font-medium text-white shadow-none transition-all duration-300 hover:bg-white/10 active:scale-95",
                    "focus-visible:ring-1 focus-visible:ring-white/20 sm:h-8",
                  )}
                  type="button"
                  variant="ghost"
                >
                  <Gauge className="size-3.5" />
                  <span className="tabular-nums">
                    {formatPlaybackRate(playbackRate)}
                  </span>
                </Button>
              )}
            />
          )}
        />
        <TooltipContent side="top">
          <p>Playback speed</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-32" side="top">
        <DropdownMenuRadioGroup
          onValueChange={nextValue => setPlaybackRate(Number(nextValue))}
          value={String(playbackRate)}
        >
          {PLAYBACK_RATES.map(rate => (
            <DropdownMenuRadioItem key={rate} value={String(rate)}>
              <span className="tabular-nums">{formatPlaybackRate(rate)}</span>
              {rate === 1 ? "Normal" : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
