import { Maximize, Minimize } from "lucide-react";
import * as React from "react";
import { setFullscreen } from "@/actions/playback";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlayerStore } from "@/stores/player";

const controlItemClass =
  "h-full border-0 bg-transparent px-2.5 text-white hover:bg-white/10 rounded-none shadow-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20";

function FullscreenEnterButton() {
  const isFullscreen = usePlayerStore((state) => state.isFullscreen);
  return (
    <Button
      className={controlItemClass}
      onClick={() => {
        void setFullscreen(!isFullscreen);
      }}
      size="icon"
      type="button"
      variant="ghost"
    >
      {isFullscreen ? (
        <Minimize className="size-4" />
      ) : (
        <Maximize className="size-4" />
      )}
    </Button>
  );
}

function FullscreenExitButton() {
  const isFullscreen = usePlayerStore((state) => state.isFullscreen);
  return (
    <Button
      className={controlItemClass}
      onClick={() => {
        void setFullscreen(!isFullscreen);
      }}
      size="icon"
      type="button"
      variant="ghost"
    >
      {isFullscreen ? (
        <Minimize className="size-4" />
      ) : (
        <Maximize className="size-4" />
      )}
    </Button>
  );
}

export function FullscreenButton() {
  const isFullscreen = usePlayerStore((state) => state.isFullscreen);

  const button = isFullscreen ? (
    <FullscreenExitButton />
  ) : (
    <FullscreenEnterButton />
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => {
          return React.cloneElement(button, props);
        }}
      />
      <TooltipContent>
        <p>{isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
