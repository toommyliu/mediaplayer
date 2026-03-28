import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CloseIcon,
  FilmIcon,
  FullscreenIcon,
  LoaderIcon,
  MuteIcon,
  NextIcon,
  PanelLeftIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  SettingsIcon,
  VolumeIcon
} from "@/lib/icons";
import { makeTimeString } from "@/lib/make-time-string";
import { getCurrentQueueItem, toFileUrl, useAppStore } from "@/lib/store";

type HoldDirection = "left" | "right" | null;

function controlButtonClass(): string {
  return "h-9 border-white/10 bg-white/10 px-3 text-sm text-white hover:bg-white/15";
}

function iconControlButtonClass(): string {
  return "size-9 border-white/10 bg-white/10 p-0 text-white hover:bg-white/15";
}

function UpNextNotification() {
  const state = useAppStore();
  const [isDismissed, setIsDismissed] = useState(false);

  const remaining = state.player.duration - state.player.currentTime;
  const showNotification =
    state.notifications.upNextEnabled &&
    !isDismissed &&
    state.player.duration > 0 &&
    remaining <= 10 &&
    remaining > 0 &&
    (state.queue.index < state.queue.items.length - 1 || state.queue.repeatMode === "all");

  useEffect(() => {
    setIsDismissed(false);
  }, [state.player.currentVideo]);

  if (!showNotification) return null;

  const nextItem =
    state.queue.index < state.queue.items.length - 1
      ? state.queue.items[state.queue.index + 1]
      : state.queue.items[0];

  const positionClass = {
    "bottom-left": "bottom-24 left-8",
    "bottom-right": "bottom-24 right-8",
    "top-left": "top-8 left-8",
    "top-right": "top-8 right-8"
  }[state.notifications.upNextPosition];

  return (
    <div
      className={`absolute z-40 flex max-w-sm flex-col gap-3 rounded-xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur-md ${positionClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Up Next
        </span>
        <Button
          className="size-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => setIsDismissed(true)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <CloseIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="line-clamp-2 text-base font-semibold">{nextItem?.name}</div>
      <div className="h-1 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, (remaining / 10) * 100))}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">Playing in {Math.ceil(remaining)}s</div>
    </div>
  );
}

function VideoInfoOverlay({ visible }: { visible: boolean }) {
  const state = useAppStore();
  const currentItem = getCurrentQueueItem(state);

  if (!visible || !currentItem || !state.notifications.videoInfoEnabled) return null;

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-20 w-full bg-gradient-to-b from-black/70 via-black/40 to-transparent p-8 pb-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {currentItem.name}
        </h1>
        {state.queue.items.length > 1 ? (
          <p className="text-sm font-medium text-white/75">
            Video {state.queue.index + 1} of {state.queue.items.length}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PlayerControls({
  onControlsMouseEnter,
  onControlsMouseLeave
}: {
  onControlsMouseEnter: () => void;
  onControlsMouseLeave: () => void;
}) {
  const state = useAppStore();
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const progressTime = dragTime ?? state.player.currentTime;
  const progressPercentage =
    state.player.duration > 0 ? (progressTime / state.player.duration) * 100 : 0;

  function seekTo(clientX: number, rect: DOMRect): number {
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percent * state.player.duration;
  }

  function setVideoTime(nextTime: number): void {
    useAppStore.getState().setCurrentTime(nextTime);
    const video = document.querySelector("video");
    if (video) {
      video.currentTime = nextTime;
    }
  }

  function handleProgressMouseDown(event: import("react").MouseEvent<HTMLDivElement>): void {
    if (!state.player.duration) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const wasPlaying = state.player.isPlaying;

    setIsDragging(true);
    setDragTime(seekTo(event.clientX, rect));

    if (wasPlaying) {
      useAppStore.getState().pausePlayback();
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
        await useAppStore.getState().togglePlayPause();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-6 pb-4 pt-20"
      id="media-controls"
      onMouseEnter={onControlsMouseEnter}
      onMouseLeave={onControlsMouseLeave}
    >
      <div className="mb-3 flex items-center justify-between text-sm font-mono text-white/90">
        <span>{makeTimeString(progressTime)}</span>
        <span>{state.player.duration ? makeTimeString(state.player.duration) : "0:00"}</span>
      </div>

      <div className="relative mb-4">
        <div
          className="relative h-2 cursor-pointer rounded-full bg-white/20"
          onClick={(event) => {
            if (isDragging || !state.player.duration) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setVideoTime(seekTo(event.clientX, rect));
          }}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={(event) => {
            if (!state.player.duration || isDragging) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setHoverTime(seekTo(event.clientX, rect));
          }}
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

        {!isDragging && state.player.duration > 0 ? (
          <div
            className="pointer-events-none absolute -top-8 rounded bg-black/70 px-2 py-1 text-xs text-white"
            style={{
              left: `${Math.max(0, Math.min(95, (hoverTime / state.player.duration) * 100))}%`
            }}
          >
            {makeTimeString(hoverTime)}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            className={iconControlButtonClass()}
            onClick={() => useAppStore.getState().toggleSidebar()}
            size="icon"
            type="button"
            variant="outline"
          >
            <PanelLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            className={iconControlButtonClass()}
            onClick={() => {
              void useAppStore.getState().playPreviousVideo();
            }}
            size="icon"
            type="button"
            variant="outline"
          >
            <PreviousIcon className="h-4 w-4" />
          </Button>
          <Button
            className={iconControlButtonClass()}
            onClick={() => {
              void useAppStore.getState().togglePlayPause();
            }}
            size="icon"
            type="button"
            variant="outline"
          >
            {state.player.isPlaying ? (
              <PauseIcon className="h-4 w-4" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
          </Button>
          <Button
            className={iconControlButtonClass()}
            onClick={() => {
              void useAppStore.getState().playNextVideo();
            }}
            size="icon"
            type="button"
            variant="outline"
          >
            <NextIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className={iconControlButtonClass()}
            onClick={() => useAppStore.getState().setMuted(!state.volume.isMuted)}
            size="icon"
            type="button"
            variant="outline"
          >
            {state.volume.isMuted || state.volume.value === 0 ? (
              <MuteIcon className="h-4 w-4" />
            ) : (
              <VolumeIcon className="h-4 w-4" />
            )}
          </Button>
          <input
            className="accent-primary"
            max={1}
            min={0}
            onChange={(event) => {
              useAppStore.getState().setVolume(Number(event.target.value));
              if (Number(event.target.value) > 0) {
                useAppStore.getState().setMuted(false);
              }
            }}
            step={0.01}
            type="range"
            value={state.volume.value}
          />
          <select
            className={controlButtonClass()}
            onChange={(event) => {
              useAppStore.getState().setPlayerState({
                aspectRatio: event.target.value as "contain" | "cover" | "fill"
              });
            }}
            value={state.player.aspectRatio}
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="fill">Fill</option>
          </select>
          <Button
            className={iconControlButtonClass()}
            onClick={() => useAppStore.getState().setSettingsDialogOpen(true)}
            size="icon"
            type="button"
            variant="outline"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
          <Button
            className={iconControlButtonClass()}
            onClick={() => {
              void useAppStore.getState().setFullscreen(!state.player.isFullscreen);
            }}
            size="icon"
            type="button"
            variant="outline"
          >
            <FullscreenIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VideoPlayer() {
  const state = useAppStore();
  const currentItem = getCurrentQueueItem(state);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isControlsHovered, setIsControlsHovered] = useState(false);
  const [holdDirection, setHoldDirection] = useState<HoldDirection>(null);

  useEffect(() => {
    useAppStore.getState().bindVideoElement(videoRef.current);
    return () => {
      useAppStore.getState().bindVideoElement(null);
    };
  }, []);

  useEffect(() => {
    useAppStore.getState().setPlayerState({ showControls });
  }, [showControls]);

  useEffect(() => {
    if (!state.player.isPlaying) {
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
  }, [state.player.isPlaying, currentItem?.id]);

  function resetHideTimer(): void {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    setShowControls(true);

    if (!isControlsHovered && state.player.isPlaying) {
      hideTimerRef.current = window.setTimeout(() => {
        if (!isControlsHovered) {
          setShowControls(false);
        }
      }, 3000);
    }
  }

  function stopHoldSeeking(): void {
    setHoldDirection(null);
    useAppStore.getState().setPlayerState({ isHolding: false });
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
    useAppStore.getState().setPlayerState({ isHolding: true });
    setHoldDirection(direction);

    holdIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current) {
        stopHoldSeeking();
        return;
      }

      const seekAmount = 0.3;
      const nextTime =
        direction === "right"
          ? Math.min(videoRef.current.currentTime + seekAmount, state.player.duration)
          : Math.max(videoRef.current.currentTime - seekAmount, 0);

      videoRef.current.currentTime = nextTime;
      useAppStore.getState().setCurrentTime(nextTime);
    }, 100);
  }

  if (!currentItem) {
    return (
      <div
        className="group flex h-full w-full items-center justify-center bg-black/90 text-center text-muted-foreground transition hover:bg-black/80"
        onDoubleClick={() => {
          void useAppStore.getState().loadFileSystemStructure();
        }}
      >
        <div>
          <FilmIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p className="text-base font-medium">No video selected</p>
          <p className="text-sm opacity-70">Double-click to open a file or folder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col" id="video-player">
      <div
        className={`relative flex min-h-0 flex-1 items-center justify-center bg-black ${
          showControls ? "" : "cursor-none"
        }`}
        id="video-container"
        onDoubleClick={async (event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("#media-controls")) return;
          await useAppStore.getState().togglePlayPause();
        }}
        onMouseDown={(event) => {
          if (event.button !== 0 || !videoRef.current) return;
          const target = event.target as HTMLElement | null;
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
          if (state.player.isPlaying && !isControlsHovered) {
            setShowControls(false);
          }
        }}
        onMouseMove={() => resetHideTimer()}
        ref={containerRef}
      >
        <video
          className={`h-full w-full bg-black ${
            state.player.aspectRatio === "cover"
              ? "object-cover"
              : state.player.aspectRatio === "fill"
                ? "object-fill"
                : "object-contain"
          }`}
          controls={false}
          disablePictureInPicture
          onCanPlay={() => useAppStore.getState().setPlayerState({ isLoading: false })}
          onEnded={() => {
            if (state.queue.repeatMode === "one" && videoRef.current) {
              videoRef.current.currentTime = 0;
              useAppStore.getState().setCurrentTime(0);
              void videoRef.current.play();
              return;
            }
            void useAppStore.getState().playNextVideo();
          }}
          onError={() => {
            useAppStore.getState().setPlayerState({
              error: "Video format not supported or file could not be played.",
              isLoading: false
            });
          }}
          onLoadedData={() => {
            useAppStore.getState().setPlayerState({ isLoading: false });
            if (videoRef.current) {
              useAppStore.getState().setDuration(videoRef.current.duration);
              void videoRef.current.play().catch(() => undefined);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              useAppStore.getState().setDuration(videoRef.current.duration);
            }
          }}
          onLoadStart={() => useAppStore.getState().setPlayerState({ isLoading: true })}
          onPause={() => useAppStore.getState().setPlayerState({ isPlaying: false })}
          onPlay={() => useAppStore.getState().setPlayerState({ isPlaying: true })}
          onSeeked={() => {
            if (videoRef.current) {
              useAppStore.getState().setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              useAppStore.getState().setCurrentTime(videoRef.current.currentTime);
            }
          }}
          preload="metadata"
          ref={videoRef}
          src={toFileUrl(currentItem.path)}
        />

        {state.player.isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
            <LoaderIcon className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : null}

        {state.player.error ? (
          <div className="absolute top-6 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {state.player.error}
          </div>
        ) : null}

        {holdDirection ? (
          <div
            className={`pointer-events-none absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm ${
              holdDirection === "left" ? "left-8" : "right-8"
            }`}
          >
            {holdDirection === "left" ? "←" : "→"}
          </div>
        ) : null}

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
      </div>
    </div>
  );
}
