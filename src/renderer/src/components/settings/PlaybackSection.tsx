import { useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useVolumeView, volumeCommands } from "@/lib/store";

export function PlaybackSection() {
  const volume = useVolumeView();
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-sm font-medium">Playback</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Autoplay follows queue selection and starts on load when a file or folder is
          opened.
        </p>
      </div>
      <div>
        <Label className="mb-2 block text-xs font-medium">Volume</Label>
        <div className="px-1 pt-1.5 flex h-8 items-center">
          <Tooltip open={isDragging}>
            <TooltipTrigger render={(props) => {
              return <Slider
                {...props}
                className="w-full"
                max={1}
                min={0}
                step={0.01}
                value={[volume.value]}
                defaultValue={[volume.value]}
                onPointerDown={() => setIsDragging(true)}
                onPointerUp={() => setIsDragging(false)}
                onMouseEnter={() => setIsDragging(true)}
                onMouseLeave={() => setIsDragging(false)}
                onValueChange={(next) => {
                  const val = Array.isArray(next) ? Number(next[0]) : Number(next);
                  volumeCommands.setVolume(val);
                  if (val > 0) {
                    volumeCommands.setMuted(false);
                  }
                }}
              />
            }} />
            <TooltipContent side="top">
              {Math.round(volume.value * 100)}%
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div >
  )
}