import * as React from "react";
import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { playbackCommands, usePlayerView } from "@/lib/store";

const controlItemClass = "h-full border-0 bg-transparent px-2.5 text-white hover:bg-white/10 rounded-none shadow-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20";

function FullscreenEnterButton() {
  const player = usePlayerView();
  return <Button
    className={controlItemClass}
    onClick={() => {
      void playbackCommands.setFullscreen(!player.isFullscreen);
    }}
    size="icon"
    type="button"
    variant="ghost"
  >
    {player.isFullscreen ? (
      <Minimize className="size-4" />
    ) : (
      <Maximize className="size-4" />
    )}
  </Button>
}

function FullscreenExitButton() {
  const player = usePlayerView();
  return <Button
    className={controlItemClass}
    onClick={() => {
      void playbackCommands.setFullscreen(!player.isFullscreen);
    }}
    size="icon"
    type="button"
    variant="ghost"
  >
    {player.isFullscreen ? (
      <Minimize className="size-4" />
    ) : (
      <Maximize className="size-4" />
    )}
  </Button>
}

export function FullscreenButton() {
  const player = usePlayerView();

  const button = player.isFullscreen ? <FullscreenExitButton /> : <FullscreenEnterButton />;

  return <Tooltip>
    <TooltipTrigger render={(props) => {
      return React.cloneElement(button, props);
    }} />
    <TooltipContent>
      <p>{player.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}</p>
    </TooltipContent>
  </Tooltip >
}