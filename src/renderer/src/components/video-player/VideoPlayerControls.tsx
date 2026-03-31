import { cn } from "@/lib/utils";
import { AspectRatioControl } from "../AspectRatioControl";
import { FullscreenButton } from "../FullscreenButton";
import { NextVideoButton } from "../NextVideoButton";
import { PlayPauseButton } from "../PlayPauseButton";
import { PreviousVideoButton } from "../PreviousVideoButton";
import { BookmarkButton } from "./BookmarkButton";
import { VideoProgressSlider } from "./VideoProgressSlider";
import { VolumeControl } from "./VolumeControl";

const controlGroupClass =
  "flex items-center rounded-lg border border-white/10 bg-white/10 overflow-hidden h-9 sm:h-8";
const controlSeparatorClass = "h-4 w-px bg-white/10 shrink-0";

export interface VideoPlayerControlsProps {
  onControlsMouseEnter: () => void;
  onControlsMouseLeave: () => void;
  visible: boolean;
}

export function VideoPlayerControls({
  onControlsMouseEnter,
  onControlsMouseLeave,
  visible,
}: VideoPlayerControlsProps) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/70 via-black/20 to-transparent px-6 pb-6 pt-6 transition-all duration-400 ease-out will-change-[transform,opacity]",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-6 opacity-0",
      )}
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
          <div className={controlSeparatorClass} />
          <BookmarkButton />
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
