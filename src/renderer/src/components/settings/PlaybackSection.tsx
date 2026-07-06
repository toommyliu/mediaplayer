import { useState } from "react";
import type { WindowBlurAction } from "@/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettingsStore } from "@/stores/settings";
import { useVolumeStore } from "@/stores/volume";

export function PlaybackSection() {
  const value = useVolumeStore((state) => state.value);
  const windowBlurAction = useSettingsStore((state) => state.windowBlurAction);
  const setMuted = useVolumeStore((state) => state.setMuted);
  const setWindowBlurAction = useSettingsStore((state) => state.setWindowBlurAction);
  const setVolume = useVolumeStore((state) => state.setVolume);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-sm font-medium">Playback</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Autoplay follows queue selection and starts on load when a file or folder is opened.
        </p>
      </div>
      <div>
        <Label className="mb-1.5 block text-xs font-medium">When Window Loses Focus</Label>
        <Select
          value={windowBlurAction}
          onValueChange={(value) => setWindowBlurAction(value as WindowBlurAction)}
        >
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue>
              {windowBlurAction === "pause"
                ? "Pause video"
                : windowBlurAction === "mute"
                  ? "Mute audio"
                  : "Keep playing"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" sideOffset={4}>
            <SelectItem value="none">Keep playing</SelectItem>
            <SelectItem value="pause">Pause video</SelectItem>
            <SelectItem value="mute">Mute audio</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Muting is temporary and restores your previous mute state when the window is focused
          again.
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
                      const val = Array.isArray(next) ? Number(next[0]) : Number(next);
                      setVolume(val);
                      if (val > 0) {
                        setMuted(false);
                      }
                    }}
                  />
                );
              }}
            />
            <TooltipContent side="top">{Math.round(value * 100)}%</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
