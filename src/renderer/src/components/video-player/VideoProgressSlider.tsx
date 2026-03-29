import { useState } from "react";
import { getVideoElement } from "@/lib/controllers/media-runtime";
import { makeTimeString } from "@/lib/make-time-string";
import {
  playerCommands,
  usePlayerView,
  playbackCommands
} from "@/lib/store";

export function VideoProgressSlider() {
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

  function handleProgressMouseDown(event: React.MouseEvent<HTMLDivElement>): void {
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
    <>
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
          aria-label="Video progress"
          aria-valuemin={0}
          aria-valuemax={player.duration}
          aria-valuenow={progressTime}
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
    </>
  );
}
