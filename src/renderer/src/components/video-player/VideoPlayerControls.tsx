import { cn } from "@/lib/utils";
import { AspectRatioControl } from "../AspectRatioControl";
import { FullscreenButton } from "../FullscreenButton";
import { NextVideoButton } from "../NextVideoButton";
import { PlayPauseButton } from "../PlayPauseButton";
import { PreviousVideoButton } from "../PreviousVideoButton";
import { BookmarkButton } from "./BookmarkButton";
import { VideoProgressSlider } from "./VideoProgressSlider";
import { VolumeControl } from "./VolumeControl";

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
        "absolute inset-x-0 bottom-0 z-30 px-6 pb-6 pt-12 transition-all duration-500 ease-out will-change-[transform,opacity]",
        "bg-linear-to-t from-black/60 via-black/20 to-transparent backdrop-blur-[2px]",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      )}
      id="media-controls"
      onMouseEnter={onControlsMouseEnter}
      onMouseLeave={onControlsMouseLeave}
    >
      <div className="relative mb-6">
        <VideoProgressSlider />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <PreviousVideoButton />
          <PlayPauseButton />
          <NextVideoButton />
          <div className="mx-1 h-4 w-px bg-white/5" />
          <VolumeControl />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <BookmarkButton />
            <AspectRatioControl />
            <FullscreenButton />
          </div>
        </div>
      </div>
    </div>
  );
}
