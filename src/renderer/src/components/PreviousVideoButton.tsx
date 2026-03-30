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
        render={(props) => (
          <Button
            {...props}
            className="h-full rounded-none border-0 bg-transparent px-2.5 text-white shadow-none transition-colors hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-inset"
            onClick={() => {
              void playPreviousVideo();
            }}
            size="icon"
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
