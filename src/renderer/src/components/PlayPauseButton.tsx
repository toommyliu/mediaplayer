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
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Button
            {...props}
            className="h-full rounded-none border-0 bg-transparent px-2.5 text-white shadow-none transition-colors hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-inset"
            onClick={() => {
              void togglePlayPause();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            {isPlaying ? (
              <PauseIcon className="size-4" />
            ) : (
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
