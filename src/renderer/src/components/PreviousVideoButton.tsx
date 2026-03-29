import { Rewind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { playbackCommands } from "@/lib/store";

export function PreviousVideoButton() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Button
            {...props}
            className="h-full border-0 bg-transparent px-2.5 text-white hover:bg-white/10 rounded-none shadow-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20"
            onClick={() => {
              void playbackCommands.playPreviousVideo();
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