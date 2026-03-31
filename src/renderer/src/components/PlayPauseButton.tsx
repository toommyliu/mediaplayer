import { PauseIcon, PlayIcon } from "lucide-react";
import { togglePlayPause } from "@/actions/playback";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlayerStore } from "@/stores/player";

export function PlayPauseButton() {
  const isPlaying = usePlayerStore(state => state.isPlaying);

  return (
    <Tooltip>
      <TooltipTrigger
        render={props => (
          <Button
            {...props}
            className="h-9 rounded-md border-0 bg-transparent px-3 text-white shadow-none transition-all duration-300 hover:bg-white/10 active:scale-90 focus-visible:ring-1 focus-visible:ring-white/20 sm:h-8"
            onClick={() => {
              void togglePlayPause();
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {isPlaying
              ? (
                  <PauseIcon className="size-4" />
                )
              : (
                  <PlayIcon className="size-4" />
                )}
          </Button>
        )}
      />
      <TooltipContent>
        <p>{isPlaying ? "Pause" : "Play"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
