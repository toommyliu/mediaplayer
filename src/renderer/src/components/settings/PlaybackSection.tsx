import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useVolumeStore } from "@/stores/volume";

export function PlaybackSection() {
  const value = useVolumeStore((state) => state.value);
  const setMuted = useVolumeStore((state) => state.setMuted);
  const setVolume = useVolumeStore((state) => state.setVolume);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-sm font-medium">Playback</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Autoplay follows queue selection and starts on load when a file or
          folder is opened.
        </p>
      </div>
      <div>
        <Label className="mb-2 block text-xs font-medium">Volume</Label>
        <div className="flex h-8 items-center px-1 pt-1.5">
          <Tooltip open={isDragging}>
            <TooltipTrigger
              render={(props) => {
                return (
                  <Slider
                    {...props}
                    className="w-full"
                    max={1}
                    min={0}
                    step={0.01}
                    value={[value]}
                    defaultValue={[value]}
                    onPointerDown={() => setIsDragging(true)}
                    onPointerUp={() => setIsDragging(false)}
                    onMouseEnter={() => setIsDragging(true)}
                    onMouseLeave={() => setIsDragging(false)}
                    onValueChange={(next) => {
                      const val = Array.isArray(next)
                        ? Number(next[0])
                        : Number(next);
                      setVolume(val);
                      if (val > 0) {
                        setMuted(false);
                      }
                    }}
                  />
                );
              }}
            />
            <TooltipContent side="top">
              {Math.round(value * 100)}%
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
