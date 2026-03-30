import { AspectRatioControl } from "../AspectRatioControl";
import { FullscreenButton } from "../FullscreenButton";
import { NextVideoButton } from "../NextVideoButton";
import { PlayPauseButton } from "../PlayPauseButton";
import { PreviousVideoButton } from "../PreviousVideoButton";
import { VideoProgressSlider } from "./VideoProgressSlider";
import { VolumeControl } from "./VolumeControl";

const controlGroupClass =
  "flex items-center rounded-lg border border-white/10 bg-white/10 overflow-hidden h-9 sm:h-8";
const controlSeparatorClass = "h-4 w-px bg-white/10 shrink-0";

export interface VideoPlayerControlsProps {
  onControlsMouseEnter: () => void;
  onControlsMouseLeave: () => void;
}

export function VideoPlayerControls({
  onControlsMouseEnter,
  onControlsMouseLeave,
}: VideoPlayerControlsProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/90 via-black/60 to-transparent px-6 pb-4 pt-12"
      id="media-controls"
      onMouseEnter={onControlsMouseEnter}
      onMouseLeave={onControlsMouseLeave}
    >
      <VideoProgressSlider />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={controlGroupClass}>
          <PreviousVideoButton />
          <div className={controlSeparatorClass} />
          <PlayPauseButton />
          <div className={controlSeparatorClass} />
          <NextVideoButton />
        </div>

        <div className="flex items-center gap-2">
          <VolumeControl />
          <div className={controlGroupClass}>
            <AspectRatioControl />
            <div className={controlSeparatorClass} />
            <FullscreenButton />
          </div>
        </div>
      </div>
    </div>
  );
}
