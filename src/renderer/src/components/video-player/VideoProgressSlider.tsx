import { useEffect, useState } from "react";
import { getVideoElement } from "@/video-element";
import { makeTimeString } from "@/lib/make-time-string";
import { Slider } from "@/components/ui/slider";
import { pausePlayback, togglePlayPause } from "@/actions/playback";
import { usePlayerStore } from "@/stores/player";

export function VideoProgressSlider() {
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localTime, setLocalTime] = useState<number | null>(null);

  // Smooth progress updates
  useEffect(() => {
    if (!isPlaying || isDragging) {
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
  }, [isPlaying, isDragging]);

  const progressTime = dragTime ?? localTime ?? currentTime;

  function setVideoTime(nextTime: number): void {
    if (!Number.isFinite(nextTime)) return;
    setCurrentTime(nextTime);
    const video = getVideoElement();
    if (video) {
      video.currentTime = nextTime;
    }
  }

  function handleValueChange(value: readonly number[] | number): void {
    if (!duration) return;
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
      <div className="mb-3 flex items-center justify-between font-mono text-sm text-white/90">
        <span>{makeTimeString(progressTime)}</span>
        <span>{duration ? makeTimeString(duration) : "0:00"}</span>
      </div>

      <div className="relative mb-4">
        <Slider
          className="w-full"
          disabled={!duration}
          min={0}
          max={duration || 100}
          step={0.01}
          value={[progressTime]}
          onValueChange={handleValueChange}
          onValueCommitted={handleValueCommit}
          onPointerDown={async () => {
            if (isPlaying) {
              setIsDragging(true);
              pausePlayback();
            }
          }}
          onPointerUp={async () => {
            if (isDragging) {
              setIsDragging(false);
              await togglePlayPause();
            }
          }}
        />
      </div>
    </>
  );
}
