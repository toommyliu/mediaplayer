import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PlayerControls } from "./VideoPlayerControls";
import { UpNextNotification } from "./UpNextNotification";
import { VideoInfoOverlay } from "./VideoInfoOverlay";

import {
  libraryCommands,
  playbackCommands,
  playerCommands,
  toFileUrl,
  useCurrentQueueItem,
  usePlayerView,
  useQueueView
} from "@/lib/store";
import { cn } from "@/lib/utils";

type HoldDirection = "left" | "right" | null;

export default function VideoPlayer() {
  const player = usePlayerView();
  const queue = useQueueView();
  const currentItem = useCurrentQueueItem();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [isControlsHovered, setIsControlsHovered] = useState(false);
  const [holdDirection, setHoldDirection] = useState<HoldDirection>(null);

  const setVideoElementRef = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    playbackCommands.bindVideoElement(element);
  }, []);

  useEffect(() => {
    playerCommands.setPlayerState({ showControls });
  }, [showControls]);

  useEffect(() => {
    if (!player.isPlaying) {
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
  }, [player.isPlaying, currentItem?.id]);

  function resetHideTimer(): void {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    setShowControls(true);

    if (!isControlsHovered && player.isPlaying) {
      hideTimerRef.current = window.setTimeout(() => {
        if (!isControlsHovered) {
          setShowControls(false);
        }
      }, 3000);
    }
  }

  function stopHoldSeeking(): void {
    setHoldDirection(null);
    playerCommands.setPlayerState({ isHolding: false });
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      stopHoldSeeking();
    };
  }, []);

  function startHoldSeeking(direction: HoldDirection): void {
    if (!videoRef.current || !direction) return;
    playerCommands.setPlayerState({ isHolding: true });
    setHoldDirection(direction);

    holdIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current) {
        stopHoldSeeking();
        return;
      }

      const seekAmount = 0.3;
      const nextTime =
        direction === "right"
          ? Math.min(videoRef.current.currentTime + seekAmount, player.duration)
          : Math.max(videoRef.current.currentTime - seekAmount, 0);

      videoRef.current.currentTime = nextTime;
      playerCommands.setCurrentTime(nextTime);
    }, 100);
  }

  if (!currentItem) {
    return (
      <div
        className="group flex h-full w-full items-center justify-center bg-black/90 text-center text-muted-foreground transition hover:bg-black/80"
        onDoubleClick={() => {
          void libraryCommands.loadFileSystemStructure();
        }}
      />
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col" id="video-player">
      <div
        className={`relative flex min-h-0 flex-1 items-center justify-center bg-black ${showControls ? "" : "cursor-none"
          }`}
        id="video-container"
        onDoubleClick={async (event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("#media-controls")) return;
          await playbackCommands.togglePlayPause();
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
          if (player.isPlaying && !isControlsHovered) {
            setShowControls(false);
          }
        }}
        onMouseMove={() => resetHideTimer()}
        ref={containerRef}
      >
        <video
          className={`h-full w-full bg-black ${player.aspectRatio === "cover"
            ? "object-cover"
            : player.aspectRatio === "fill"
              ? "object-fill"
              : "object-contain"
            }`}
          controls={false}
          disablePictureInPicture
          onCanPlay={() => playerCommands.setPlayerState({ isLoading: false })}
          onEnded={() => {
            if (queue.repeatMode === "one" && videoRef.current) {
              videoRef.current.currentTime = 0;
              playerCommands.setCurrentTime(0);
              void videoRef.current.play();
              return;
            }
            void playbackCommands.playNextVideo();
          }}
          onError={() => {
            playerCommands.setPlayerState({
              error: "Video format not supported or file could not be played.",
              isLoading: false
            });
          }}
          onLoadedData={() => {
            playerCommands.setPlayerState({ isLoading: false });
            if (videoRef.current) {
              playerCommands.setDuration(videoRef.current.duration);
              void videoRef.current.play().catch(() => undefined);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              playerCommands.setDuration(videoRef.current.duration);
            }
          }}
          onLoadStart={() => playerCommands.setPlayerState({ isLoading: true })}
          onPause={() => playerCommands.setPlayerState({ isPlaying: false })}
          onPlay={() => playerCommands.setPlayerState({ isPlaying: true })}
          onSeeked={() => {
            if (videoRef.current) {
              playerCommands.setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              playerCommands.setCurrentTime(videoRef.current.currentTime);
            }
          }}
          preload="metadata"
          ref={setVideoElementRef}
          src={toFileUrl(currentItem.path)}
        />

        {player.isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : null}

        {player.error ? (
          <div className="absolute top-6 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {player.error}
          </div>
        ) : null}

        {holdDirection ? (
          <div
            className={cn("pointer-events-none absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm",
              holdDirection === "left" ? "left-8" : "right-8"
            )}
          >
            {holdDirection === "left" ? "←" : "→"}
          </div>
        ) : null}

        {showControls && (
          <>
            <VideoInfoOverlay visible={showControls} />
            <UpNextNotification />
            <PlayerControls
              onControlsMouseEnter={() => {
                setIsControlsHovered(true);
                setShowControls(true);
              }}
              onControlsMouseLeave={() => {
                setIsControlsHovered(false);
                resetHideTimer();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
