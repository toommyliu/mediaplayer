import { Rewind } from "lucide-react";
import { playPreviousVideo } from "@/actions/playback";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PreviousVideoButton() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={props => (
          <Button
            {...props}
            className="h-9 rounded-md border-0 bg-transparent px-3 text-white shadow-none transition-all duration-300 hover:bg-white/10 active:scale-90 focus-visible:ring-1 focus-visible:ring-white/20 sm:h-8"
            onClick={() => {
              void playPreviousVideo();
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Rewind className="size-4" />
          </Button>
        )}
      />
      <TooltipContent>
        <p>Previous video</p>
      </TooltipContent>
    </Tooltip>
  );
}
