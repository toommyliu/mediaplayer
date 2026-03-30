import { FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { playNextVideo } from "@/lib/controllers/playback-controller";

export function NextVideoButton() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Button
            {...props}
            className="h-full rounded-none border-0 bg-transparent px-2.5 text-white shadow-none transition-colors hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-inset"
            onClick={() => {
              void playNextVideo();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <FastForward className="size-4" />
          </Button>
        )}
      />
      <TooltipContent>
        <p>Next video</p>
      </TooltipContent>
    </Tooltip>
  );
}
