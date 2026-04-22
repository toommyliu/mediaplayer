import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadFileSystemStructure } from "@/actions/library";
import {
  bindPlaybackVideoElement,
  playNextVideo,
  togglePlayPause,
} from "@/actions/playback";
import { toFileUrl } from "@/lib/media-path";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player";
import { useCurrentQueueItem, useQueueStore } from "@/stores/queue";
import { BookmarkIndicator } from "./BookmarkIndicator";
import { UpNextNotification } from "./UpNextNotification";
import { VideoInfoOverlay } from "./VideoInfoOverlay";
import { VideoPlayerControls } from "./VideoPlayerControls";

type HoldDirection = "left" | "right" | null;

export default function VideoPlayer() {
  const aspectRatio = usePlayerStore(state => state.aspectRatio);
  const duration = usePlayerStore(state => state.duration);
  const error = usePlayerStore(state => state.error);
  const isLoading = usePlayerStore(state => state.isLoading);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const setCurrentTime = usePlayerStore(state => state.setCurrentTime);
  const setDuration = usePlayerStore(state => state.setDuration);
  const setPlayerState = usePlayerStore(state => state.setPlayerState);
  const repeatMode = useQueueStore(state => state.repeatMode);
  const currentItem = useCurrentQueueItem();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const [showControls, setShowControls] = useState(false);
  const isControlsHoveredRef = useRef(false);
  const [holdDirection, setHoldDirection] = useState<HoldDirection>(null);

  const setVideoElementRef = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    bindPlaybackVideoElement(element);
  }, []);

  useEffect(() => {
    setPlayerState({ showControls });
  }, [setPlayerState, showControls]);

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
    };
  }, [stopHoldSeeking]);

  function startHoldSeeking(direction: HoldDirection): void {
    if (!videoRef.current || !direction)
      return;
    setPlayerState({ isHolding: true });
    setHoldDirection(direction);

    holdIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current) {
        stopHoldSeeking();
        return;
      }

      const seekAmount = 0.3;
      const currentDuration = duration;
      if (!Number.isFinite(currentDuration))
        return;

      const nextTime
        = direction === "right"
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
          if (target?.closest("#media-controls"))
            return;
          await togglePlayPause();
        }}
        onMouseDown={(event) => {
          if (event.button !== 0 || !videoRef.current)
            return;
          const target = event.target as HTMLElement | null;
          if (target && !event.currentTarget.contains(target))
            return;
          if (target?.closest("#media-controls"))
            return;
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect)
            return;

          const direction: HoldDirection
            = event.clientX - rect.left < rect.width / 2 ? "left" : "right";
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
        ref={containerRef}
      >
        <video
          className={`h-full w-full bg-black ${
            aspectRatio === "cover"
              ? "object-cover"
              : aspectRatio === "fill"
                ? "object-fill"
                : "object-contain"
          }`}
          controls={false}
          disablePictureInPicture
          onCanPlay={() => setPlayerState({ isLoading: false })}
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
            setPlayerState({ isLoading: false });
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              void videoRef.current.play().catch(() => undefined);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
            }
          }}
          onLoadStart={() => setPlayerState({ isLoading: true })}
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

        {isLoading
          ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )
          : null}

        {error
          ? (
              <div className="border-destructive/30 bg-destructive/10 text-destructive absolute top-6 left-1/2 z-30 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm">
                {error}
              </div>
            )
          : null}

        {holdDirection
          ? (
              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm",
                  holdDirection === "left" ? "left-8" : "right-8",
                )}
              >
                {holdDirection === "left" ? "←" : "→"}
              </div>
            )
          : null}

        <VideoInfoOverlay visible={showControls} />
        <UpNextNotification />
        <BookmarkIndicator />
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
