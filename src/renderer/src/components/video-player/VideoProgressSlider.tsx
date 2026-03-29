import { useEffect, useState } from "react";
import { getVideoElement } from "@/lib/controllers/media-runtime";
import { makeTimeString } from "@/lib/make-time-string";
import {
  playerCommands,
  usePlayerView,
  playbackCommands
} from "@/lib/store";
import { Slider } from "@/components/ui/slider";

export function VideoProgressSlider() {
  const player = usePlayerView();
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localTime, setLocalTime] = useState<number | null>(null);

  // Smooth progress updates
  useEffect(() => {
    if (!player.isPlaying || isDragging) {
      setLocalTime(null);
      return;
    }

    let frameId: number;
    const updateTime = () => {
      const video = getVideoElement();
      if (video && !video.paused) {
        setLocalTime(video.currentTime);
      }
      frameId = requestAnimationFrame(updateTime);
    };

    frameId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(frameId);
  }, [player.isPlaying, isDragging]);

  const progressTime = dragTime ?? localTime ?? player.currentTime;

  function setVideoTime(nextTime: number): void {
    if (!Number.isFinite(nextTime)) return;
    playerCommands.setCurrentTime(nextTime);
    const video = getVideoElement();
    if (video) {
      video.currentTime = nextTime;
    }
  }

  function handleValueChange(value: readonly number[] | number): void {
    if (!player.duration) return;
    const nextTime = Array.isArray(value) ? value[0] : value;
    setDragTime(nextTime);
    setVideoTime(nextTime);
  }

  function handleValueCommit(value: readonly number[] | number): void {
    const nextTime = Array.isArray(value) ? value[0] : value;
    setVideoTime(nextTime);
    setDragTime(null);
    setIsDragging(false);
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between text-sm font-mono text-white/90">
        <span>{makeTimeString(progressTime)}</span>
        <span>{player.duration ? makeTimeString(player.duration) : "0:00"}</span>
      </div>

      <div className="relative mb-4">
        <Slider
          className="w-full"
          disabled={!player.duration}
          min={0}
          max={player.duration || 100}
          step={0.01}
          value={[progressTime]}
          onValueChange={handleValueChange}
          onValueCommitted={handleValueCommit}
          onPointerDown={async () => {
            if (player.isPlaying) {
              setIsDragging(true);
              playbackCommands.pausePlayback();
            }
          }}
          onPointerUp={async () => {
            if (isDragging) {
              setIsDragging(false);
              await playbackCommands.togglePlayPause();
            }
          }}
        />
      </div>
    </>
  );
}