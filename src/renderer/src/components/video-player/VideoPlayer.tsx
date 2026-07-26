import type { WheelEvent } from "react";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadFileSystemStructure } from "@/actions/library";
import {
  bindPlaybackVideoElement,
  playNextVideo,
  refreshPictureInPictureState,
  togglePlayPause,
} from "@/actions/playback";
import { clamp } from "@/lib/clamp";
import {
  TRACKPAD_GESTURE_AXIS_RATIO,
  TRACKPAD_GESTURE_THRESHOLD,
  TRACKPAD_SEEK_TIME_STEP,
  TRACKPAD_VOLUME_STEP,
} from "@/lib/constants";
import { toFileUrl } from "@/lib/media-path";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player";
import { useCurrentQueueItem, useQueueStore } from "@/stores/queue";
import { useVolumeStore } from "@/stores/volume";
import { BookmarkIndicator } from "./BookmarkIndicator";
import { QuickJumpDialog } from "./QuickJumpDialog";
import { UpNextNotification } from "./UpNextNotification";
import { VideoInfoOverlay } from "./VideoInfoOverlay";
import { VideoPlayerControls } from "./VideoPlayerControls";

type HoldDirection = "left" | "right" | null;

export default function VideoPlayer() {
  const aspectRatio = usePlayerStore((state) => state.aspectRatio);
  const duration = usePlayerStore((state) => state.duration);
  const error = usePlayerStore((state) => state.error);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const isPictureInPicture = usePlayerStore((state) => state.isPictureInPicture);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isQuickJumpOpen = usePlayerStore((state) => state.isQuickJumpOpen);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const setPlayerState = usePlayerStore((state) => state.setPlayerState);
  const repeatMode = useQueueStore((state) => state.repeatMode);
  const currentItem = useCurrentQueueItem();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gestureDeltaXRef = useRef(0);
  const gestureDeltaYRef = useRef(0);
  const gestureResetTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const [showControls, setShowControls] = useState(false);
  const isControlsHoveredRef = useRef(false);
  const [holdDirection, setHoldDirection] = useState<HoldDirection>(null);

  const syncPictureInPictureState = useCallback(() => {
    refreshPictureInPictureState();
  }, []);

  const restoreCurrentTime = useCallback((video: HTMLVideoElement): void => {
    const currentTime = usePlayerStore.getState().currentTime;
    if (!Number.isFinite(currentTime) || currentTime <= 0) return;

    const duration = Number.isFinite(video.duration) ? video.duration : currentTime;
    const nextTime = clamp(currentTime, 0, duration);
    if (Math.abs(video.currentTime - nextTime) > 0.25) {
      video.currentTime = nextTime;
    }
  }, []);

  const setVideoElementRef = useCallback(
    (element: HTMLVideoElement | null) => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("enterpictureinpicture", syncPictureInPictureState);
        videoRef.current.removeEventListener("leavepictureinpicture", syncPictureInPictureState);
      }

      videoRef.current = element;
      if (element) {
        element.playbackRate = playbackRate;
        element.addEventListener("enterpictureinpicture", syncPictureInPictureState);
        element.addEventListener("leavepictureinpicture", syncPictureInPictureState);
      }
      bindPlaybackVideoElement(element);
      refreshPictureInPictureState();
    },
    [playbackRate, syncPictureInPictureState],
  );

  useEffect(() => {
    setPlayerState({ showControls });
  }, [setPlayerState, showControls]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const stopHoldSeeking = useCallback(() => {
    setHoldDirection(null);
    setPlayerState({ isHolding: false });
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, [setPlayerState]);

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    setShowControls(true);
    const isHovered = isControlsHoveredRef.current;

    if (!isHovered && isPlaying) {
      hideTimerRef.current = window.setTimeout(() => {
        if (!isControlsHoveredRef.current) {
          setShowControls(false);
        }
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      return;
    }

    resetHideTimer();
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [currentItem?.id, isPlaying, resetHideTimer]);

  useEffect(() => {
    return () => {
      stopHoldSeeking();
      if (gestureResetTimerRef.current) {
        window.clearTimeout(gestureResetTimerRef.current);
        gestureResetTimerRef.current = null;
      }
    };
  }, [stopHoldSeeking]);

  const shouldIgnoreGestureTarget = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return true;

    return Boolean(
      target.closest(
        "#media-controls, button, input, textarea, select, [role='slider'], [role='button'], [data-slot]",
      ),
    );
  }, []);

  const seekByGestureStep = useCallback(
    (direction: "backward" | "forward", steps: number): void => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(duration)) return;

      const delta = TRACKPAD_SEEK_TIME_STEP * steps;
      const nextTime =
        direction === "forward"
          ? Math.min(duration, video.currentTime + delta)
          : Math.max(0, video.currentTime - delta);

      video.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [duration, setCurrentTime],
  );

  const adjustVolumeByGestureStep = useCallback((direction: "down" | "up", steps: number): void => {
    const volumeStore = useVolumeStore.getState();
    const delta = TRACKPAD_VOLUME_STEP * steps;
    const nextVolume =
      direction === "up"
        ? clamp(volumeStore.value + delta, 0, 1)
        : clamp(volumeStore.value - delta, 0, 1);

    volumeStore.setVolume(nextVolume);
    volumeStore.setMuted(nextVolume === 0);
    if (nextVolume > 0) volumeStore.setMuted(false);
  }, []);

  const handleWheelGesture = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!videoRef.current || shouldIgnoreGestureTarget(event.target)) return;

      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);

      if (absX === 0 && absY === 0) return;

      const horizontal = absX > absY * TRACKPAD_GESTURE_AXIS_RATIO;
      const vertical = absY > absX * TRACKPAD_GESTURE_AXIS_RATIO;

      if (!horizontal && !vertical) return;

      event.preventDefault();
      resetHideTimer();

      if (gestureResetTimerRef.current) window.clearTimeout(gestureResetTimerRef.current);

      gestureResetTimerRef.current = window.setTimeout(() => {
        gestureDeltaXRef.current = 0;
        gestureDeltaYRef.current = 0;
        gestureResetTimerRef.current = null;
      }, 160);

      if (horizontal) {
        gestureDeltaXRef.current += event.deltaX;
        gestureDeltaYRef.current = 0;

        const steps = Math.trunc(Math.abs(gestureDeltaXRef.current) / TRACKPAD_GESTURE_THRESHOLD);
        if (steps === 0) return;

        const direction = gestureDeltaXRef.current > 0 ? "forward" : "backward";
        seekByGestureStep(direction, steps);
        gestureDeltaXRef.current -=
          Math.sign(gestureDeltaXRef.current) * steps * TRACKPAD_GESTURE_THRESHOLD;
        return;
      }

      gestureDeltaYRef.current += event.deltaY;
      gestureDeltaXRef.current = 0;

      const steps = Math.trunc(Math.abs(gestureDeltaYRef.current) / TRACKPAD_GESTURE_THRESHOLD);
      if (steps === 0) return;

      const direction = gestureDeltaYRef.current < 0 ? "up" : "down";
      adjustVolumeByGestureStep(direction, steps);
      gestureDeltaYRef.current -=
        Math.sign(gestureDeltaYRef.current) * steps * TRACKPAD_GESTURE_THRESHOLD;
    },
    [adjustVolumeByGestureStep, resetHideTimer, seekByGestureStep, shouldIgnoreGestureTarget],
  );

  function startHoldSeeking(direction: HoldDirection): void {
    if (!videoRef.current || !direction) return;
    setPlayerState({ isHolding: true });
    setHoldDirection(direction);

    holdIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current) {
        stopHoldSeeking();
        return;
      }

      const seekAmount = 0.3;
      const currentDuration = duration;
      if (!Number.isFinite(currentDuration)) return;

      const nextTime =
        direction === "right"
          ? Math.min(videoRef.current.currentTime + seekAmount, currentDuration)
          : Math.max(videoRef.current.currentTime - seekAmount, 0);

      videoRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }, 100);
  }

  if (!currentItem) {
    return (
      <div
        className="group text-muted-foreground flex h-full w-full items-center justify-center bg-black/90 text-center transition hover:bg-black/80"
        onDoubleClick={() => {
          void loadFileSystemStructure();
        }}
      />
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden" id="video-player">
      <div
        className={`relative flex min-h-0 flex-1 items-center justify-center bg-black ${
          showControls ? "" : "cursor-none"
        }`}
        id="video-container"
        onDoubleClick={async (event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("#media-controls")) return;
          await togglePlayPause();
        }}
        onMouseDown={(event) => {
          if (event.button !== 0 || !videoRef.current) return;
          const target = event.target as HTMLElement | null;
          if (target && !event.currentTarget.contains(target)) return;
          if (target?.closest("#media-controls")) return;
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;

          const direction: HoldDirection =
            event.clientX - rect.left < rect.width / 2 ? "left" : "right";
          holdTimerRef.current = window.setTimeout(() => {
            startHoldSeeking(direction);
          }, 300);

          const cleanup = () => {
            stopHoldSeeking();
            window.removeEventListener("mouseup", cleanup);
          };
          window.addEventListener("mouseup", cleanup, { once: true });
        }}
        onMouseLeave={() => {
          if (hideTimerRef.current) {
            window.clearTimeout(hideTimerRef.current);
          }
          if (isPlaying && !isControlsHoveredRef.current) {
            setShowControls(false);
          }
        }}
        onMouseMove={() => resetHideTimer()}
        onWheel={handleWheelGesture}
        ref={containerRef}
      >
        <video
          className={cn(
            "h-full w-full bg-black",
            isPictureInPicture ? "opacity-0" : "opacity-100",
            aspectRatio === "cover"
              ? "object-cover"
              : aspectRatio === "fill"
                ? "object-fill"
                : "object-contain",
          )}
          controls={false}
          onCanPlay={() => setPlayerState({ error: null, isLoading: false })}
          onEnded={() => {
            if (repeatMode === "one" && videoRef.current) {
              videoRef.current.currentTime = 0;
              setCurrentTime(0);
              void videoRef.current.play();
              return;
            }
            void playNextVideo();
          }}
          onError={() => {
            setPlayerState({
              error: "Video format not supported or file could not be played.",
              isLoading: false,
            });
          }}
          onLoadedData={() => {
            setPlayerState({ error: null, isLoading: false });
            if (videoRef.current) {
              videoRef.current.playbackRate = playbackRate;
              restoreCurrentTime(videoRef.current);
              setDuration(videoRef.current.duration);
              if (usePlayerStore.getState().isPlaying) {
                void videoRef.current.play().catch(() => undefined);
              }
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              restoreCurrentTime(videoRef.current);
              setDuration(videoRef.current.duration);
            }
            refreshPictureInPictureState();
          }}
          onLoadStart={() => setPlayerState({ error: null, isLoading: true })}
          onPause={() => setPlayerState({ isPlaying: false })}
          onPlay={() => setPlayerState({ isPlaying: true })}
          onSeeked={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          preload="metadata"
          ref={setVideoElementRef}
          src={toFileUrl(currentItem.path)}
        />

        {isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : null}

        {error ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive absolute top-6 left-1/2 z-30 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm">
            {error}
          </div>
        ) : null}

        {holdDirection ? (
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm",
              holdDirection === "left" ? "left-8" : "right-8",
            )}
          >
            {holdDirection === "left" ? "←" : "→"}
          </div>
        ) : null}

        <VideoInfoOverlay visible={showControls} />
        <UpNextNotification />
        <BookmarkIndicator />
        {isQuickJumpOpen ? (
          <QuickJumpDialog
            onOpenChange={(open) => {
              setPlayerState({ isQuickJumpOpen: open });
            }}
            open={isQuickJumpOpen}
          />
        ) : null}
        <VideoPlayerControls
          onControlsMouseEnter={() => {
            isControlsHoveredRef.current = true;
            setShowControls(true);
          }}
          onControlsMouseLeave={() => {
            isControlsHoveredRef.current = false;
            resetHideTimer();
          }}
          visible={showControls}
        />
      </div>
    </div>
  );
}
