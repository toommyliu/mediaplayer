import { FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playbackCommands } from "@/lib/store";

export function NextVideoButton() {
  return <Button
    className="h-full border-0 bg-transparent px-2.5 text-white hover:bg-white/10 rounded-none shadow-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20"
    onClick={() => {
      void playbackCommands.playNextVideo();
    }}
    size="icon"
    type="button"
    variant="ghost"
  >
    <FastForward className="size-4" />
  </Button>
}