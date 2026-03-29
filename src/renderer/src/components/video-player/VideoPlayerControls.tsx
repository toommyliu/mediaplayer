import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Minimize, Maximize } from "lucide-react";
import { getVideoElement } from "@/lib/controllers/media-runtime";
import {
  NextIcon,
  PanelLeftIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
} from "@/lib/icons";
import { makeTimeString } from "@/lib/make-time-string";
import {
  playbackCommands,
  playerCommands,
  sidebarCommands,
  usePlayerView
} from "@/lib/store";
import { VolumeControl } from "./VolumeControl";
import { FullscreenButton } from "../FullscreenButton";

const controlGroupClass = "flex items-center rounded-lg border border-white/10 bg-white/10 overflow-hidden h-9 sm:h-8";
const controlItemClass = "h-full border-0 bg-transparent px-2.5 text-white hover:bg-white/10 rounded-none shadow-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20";
const controlSeparatorClass = "h-4 w-px bg-white/10 shrink-0";

export interface PlayerControlsProps {
  onControlsMouseEnter: () => void;
  onControlsMouseLeave: () => void;
}

export function PlayerControls({
  onControlsMouseEnter,
  onControlsMouseLeave
}: PlayerControlsProps) {
  const player = usePlayerView();
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const progressTime = dragTime ?? player.currentTime;
  const progressPercentage =
    player.duration > 0 ? (progressTime / player.duration) * 100 : 0;

  function seekTo(clientX: number, rect: DOMRect): number {
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percent * player.duration;
  }

  function setVideoTime(nextTime: number): void {
    playerCommands.setCurrentTime(nextTime);
    const video = getVideoElement();
    if (video) {
      video.currentTime = nextTime;
    }
  }

  function handleProgressMouseDown(event: import("react").MouseEvent<HTMLDivElement>): void {
    if (!player.duration) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const wasPlaying = player.isPlaying;

    setIsDragging(true);
    setDragTime(seekTo(event.clientX, rect));

    if (wasPlaying) {
      playbackCommands.pausePlayback();
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setDragTime(seekTo(moveEvent.clientX, rect));
    };

    const handleMouseUp = async (upEvent: MouseEvent) => {
      const nextTime = seekTo(upEvent.clientX, rect);
      setVideoTime(nextTime);
      setDragTime(null);
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (wasPlaying) {
        await playbackCommands.togglePlayPause();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/90 via-black/60 to-transparent px-6 pb-4 pt-12"
      id="media-controls"
      onMouseEnter={onControlsMouseEnter}
      onMouseLeave={onControlsMouseLeave}
    >
      <div className="mb-3 flex items-center justify-between text-sm font-mono text-white/90">
        <span>{makeTimeString(progressTime)}</span>
        <span>{player.duration ? makeTimeString(player.duration) : "0:00"}</span>
      </div>

      <div className="relative mb-4">
        <div
          className="relative h-2 cursor-pointer rounded-full bg-white/20"
          onClick={(event) => {
            if (isDragging || !player.duration) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setVideoTime(seekTo(event.clientX, rect));
          }}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={(event) => {
            if (!player.duration || isDragging) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setHoverTime(seekTo(event.clientX, rect));
          }}
          onMouseLeave={() => setHoverTime(0)}
          role="slider"
          tabIndex={0}
        >
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
          />
        </div>

        {!isDragging && player.duration > 0 && hoverTime > 0 ? (
          <div
            className="pointer-events-none absolute -top-8 rounded bg-black/70 px-2 py-1 text-xs text-white"
            style={{
              left: `${Math.max(0, Math.min(95, (hoverTime / player.duration) * 100))}%`
            }}
          >
            {makeTimeString(hoverTime)}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={controlGroupClass}>
          <Button
            className={controlItemClass}
            onClick={() => sidebarCommands.toggleSidebar()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PanelLeftIcon className="size-4" />
          </Button>
          <div className={controlSeparatorClass} />
          <Button
            className={controlItemClass}
            onClick={() => {
              void playbackCommands.playPreviousVideo();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PreviousIcon className="size-4" />
          </Button>
          <div className={controlSeparatorClass} />
          <Button
            className={controlItemClass}
            onClick={() => {
              void playbackCommands.togglePlayPause();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            {player.isPlaying ? (
              <PauseIcon className="size-4" />
            ) : (
              <PlayIcon className="size-4" />
            )}
          </Button>
          <div className={controlSeparatorClass} />
          <Button
            className={controlItemClass}
            onClick={() => {
              void playbackCommands.playNextVideo();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <NextIcon className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <VolumeControl />
          <div className={controlGroupClass}>
            <Select
              onValueChange={(nextValue) => {
                playerCommands.setPlayerState({
                  aspectRatio: nextValue as "contain" | "cover" | "fill"
                });
              }}
              value={player.aspectRatio}
            >
              <SelectTrigger className="h-full border-0 bg-transparent px-3 text-xs font-medium text-white shadow-none ring-0 hover:bg-white/10 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="fill">Fill</SelectItem>
              </SelectContent>
            </Select>
            <div className={controlSeparatorClass} />
            <FullscreenButton />
          </div>
        </div>
      </div>
    </div>
  );
}
