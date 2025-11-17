<script lang="ts">
  import PlayButton from "./controls/PlayButton.svelte";
  import PreviousButton from "./controls/PreviousButton.svelte";
  import ForwardButton from "./controls/ForwardButton.svelte";
  import VolumeControl from "./controls/VolumeControl.svelte";
  import SettingsButton from "./controls/SettingsButton.svelte";
  import FullScreenButton from "./controls/FullScreenButton.svelte";
  import SideBarButton from "./controls/SideBarButton.svelte";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger
  } from "$components/ui/dropdown-menu";
  import TablerAspectRatio from "~icons/tabler/aspect-ratio";

  import { playerState } from "$lib/state/player.svelte";

  import { makeTimeString } from "$lib/makeTimeString";
  import { SEEK_TIME_STEP } from "$lib/constants";
  import { cn } from "$lib/utils";

  let { aspectRatio, onAspectRatioChange }: Props = $props();

  type Props = {
    aspectRatio: "contain" | "cover" | "fill";
    onAspectRatioChange: (mode: "contain" | "cover" | "fill") => void;
  };

  let isDragging = $state(false);
  let hoverTime = $state(0);
  let isHovering = $state(false);

  let dragTime = $state<number | null>(null);
  let dragTargetPercentage = $state<number | null>(null);
  let dragAnimationFrameId: number | null = null;

  let smoothProgressPercentage = $state(0);
  let animationFrameId: number | null = null;

  const SEEK_THROTTLE_MS = 100;

  const lerp = (start: number, end: number, factor: number): number =>
    start + (end - start) * factor;

  $effect(() => {
    if (!playerState.duration) {
      smoothProgressPercentage = 0;
      return;
    }

    const targetPercentage =
      isDragging && dragTime !== null
        ? (dragTime / playerState.duration) * 100
        : (playerState.currentTime / playerState.duration) * 100;

    // If dragging, skip the normal animation; a separate drag animation will lerp toward the drag target
    if (isDragging) {
      return;
    }

    // For small changes or when seeking, update immediately
    const diff = Math.abs(targetPercentage - smoothProgressPercentage);
    if (diff > 5 || diff < 0.01) {
      smoothProgressPercentage = targetPercentage;
      return;
    }

    const startTime = performance.now();
    const startPercentage = smoothProgressPercentage;

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const duration = 100; // Animation duration in ms
      const progress = Math.min(elapsed / duration, 1);

      // Use a gentler easing for more natural movement
      const easedProgress = progress * (2 - progress); // ease-out quad

      smoothProgressPercentage = lerp(startPercentage, targetPercentage, easedProgress);

      if (progress < 1 && !isDragging) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        smoothProgressPercentage = targetPercentage;
        animationFrameId = null;
      }
    };

    // Cancel any existing animation
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };
  });

  const handleSeek = (ev: MouseEvent, progressBar?: HTMLElement, barRect?: DOMRect): void => {
    if (!playerState.videoElement || !playerState.duration) return;

    const target = progressBar ?? (ev.currentTarget as HTMLElement);
    if (!target) return;

    const rect = barRect ?? target.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    const newTime = percent * playerState.duration;

    playerState.currentTime = newTime;

    try {
      playerState.videoElement.currentTime = newTime;
    } catch (error) {
      console.error("Error seeking video:", error);
    }
  };

  const startDragAnimation = (): void => {
    if (dragAnimationFrameId) return;

    const step = (): void => {
      if (!isDragging || dragTargetPercentage === null) {
        dragAnimationFrameId = null;
        return;
      }

      // Lerp while dragging for a smooth feel (lower factor = smoother but slightly laggier)
      smoothProgressPercentage = lerp(smoothProgressPercentage, dragTargetPercentage, 0.22);

      // Stop when close enough to target (use a slightly larger threshold for stability)
      if (Math.abs(smoothProgressPercentage - dragTargetPercentage) < 0.12) {
        smoothProgressPercentage = dragTargetPercentage;
        dragAnimationFrameId = null;
        return;
      }

      dragAnimationFrameId = requestAnimationFrame(step);
    };

    dragAnimationFrameId = requestAnimationFrame(step);
  };

  const handleProgressClick = (ev: MouseEvent): void => {
    if (isDragging) return;

    handleSeek(ev);
  };

  const handleProgressMouseDown = (ev: MouseEvent): void => {
    if (!playerState.videoElement || !playerState.duration) return;
    ev.preventDefault();
    isDragging = true;
    const wasPlaying = playerState.isPlaying;
    const progressBar = ev.currentTarget as HTMLElement;
    const barRect = progressBar.getBoundingClientRect();

    // Initialize dragTime and target percent from the initial pointer position
    const initialPercent = Math.max(0, Math.min(1, (ev.clientX - barRect.left) / barRect.width));
    dragTime = initialPercent * playerState.duration;
    dragTargetPercentage = initialPercent * 100;
    startDragAnimation();

    // If playing, pause playback for smoother scrubbing visuals
    try {
      if (wasPlaying && playerState.videoElement && !playerState.videoElement.paused) {
        playerState.videoElement.pause();
      }
    } catch (e) {
      console.warn("Could not pause video for scrubbing", e);
    }

    let lastClientX = ev.clientX;
    let dragFrameId: number | null = null;

    let lastSeekTime = 0;
    const performDragUpdate = (): void => {
      if (!barRect || !playerState.duration) return;
      const percent = Math.max(0, Math.min(1, (lastClientX - barRect.left) / barRect.width));
      dragTime = percent * playerState.duration;
      dragTargetPercentage = percent * 100;
      startDragAnimation();

      // Throttled seek: update the actual video element and playerState.currentTime at most every SEEK_THROTTLE_MS
      const now = Date.now();
      if (now - lastSeekTime >= SEEK_THROTTLE_MS) {
        lastSeekTime = now;
        const timeToSeek = dragTime ?? playerState.currentTime;
        try {
          playerState.currentTime = timeToSeek;
          if (playerState.videoElement) {
            if (playerState.videoElement.readyState >= 2) {
              playerState.videoElement.currentTime = timeToSeek;
            } else {
              // If not ready, wait for canplay and then set
              const onCanPlay = (): void => {
                try {
                  if (playerState.videoElement) {
                    playerState.videoElement.currentTime = timeToSeek;
                  }
                } catch (e) {
                  console.warn("Error setting currentTime after canplay", e);
                }
                playerState.videoElement?.removeEventListener("canplay", onCanPlay);
              };
              playerState.videoElement.addEventListener("canplay", onCanPlay);
            }
          }
        } catch (error) {
          console.error("Error seeking video during drag:", error);
        }
      }

      dragFrameId = null;
    };

    const handleMouseMove = (ev: MouseEvent): void => {
      if (!isDragging) return;
      lastClientX = ev.clientX;
      dragFrameId ??= requestAnimationFrame(performDragUpdate);
      ev.preventDefault();
    };

    const handleMouseUp = async (): Promise<void> => {
      // Apply final seek to player state and video element
      const finalTime = dragTime ?? playerState.currentTime;
      dragTime = null;
      isDragging = false;

      // stop drag animation and clear target
      if (dragAnimationFrameId) {
        cancelAnimationFrame(dragAnimationFrameId);
        dragAnimationFrameId = null;
      }
      dragTargetPercentage = null;

      try {
        playerState.currentTime = finalTime;
        if (playerState.videoElement) {
          playerState.videoElement.currentTime = finalTime;
        }
      } catch (error) {
        console.error("Error seeking video on scrub end:", error);
      }

      if (wasPlaying && playerState.videoElement) {
        try {
          if (playerState.videoElement.readyState >= 2) {
            await playerState.videoElement.play();
          } else {
            const onCanPlay = async (): Promise<void> => {
              await playerState.videoElement?.play();
              playerState.videoElement?.removeEventListener("canplay", onCanPlay);
            };
            playerState.videoElement.addEventListener("canplay", onCanPlay);
          }
        } catch (e) {
          console.warn("Could not resume playback after scrubbing", e);
        }
      }

      if (dragFrameId !== null) {
        cancelAnimationFrame(dragFrameId);
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleProgressMouseMove = (ev: MouseEvent): void => {
    if (!playerState.duration || isDragging) return;

    const progressBar = ev.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));

    const newHoverTime = percent * playerState.duration;
    if (Math.abs(hoverTime - newHoverTime) > 0.1) {
      hoverTime = newHoverTime;
    }
  };

  const hoverPercentage = $derived(
    playerState.duration > 0 ? (hoverTime / playerState.duration) * 100 : 0
  );
</script>

<div
  id="media-controls"
  class="relative bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20 pb-4"
>
  <!-- Progress Bar Section -->
  <div class="px-6">
    <div class="w-full">
      <!-- Time Display -->
      <div class="mb-3 flex items-center justify-between">
        <span class="font-mono text-sm text-white/90 tabular-nums">
          {makeTimeString(isDragging && dragTime !== null ? dragTime : playerState.currentTime)}
        </span>
        <span class="font-mono text-sm text-white/70 tabular-nums">
          {#if playerState.duration}
            {makeTimeString(playerState.duration)}
          {:else}
            0:00
          {/if}
        </span>
      </div>

      <!-- Progress Bar Container -->
      <div class="relative">
        <div
          class={cn(
            "group relative h-2 overflow-visible rounded-full bg-white/20 backdrop-blur-sm",
            "transition-all duration-200 focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-black/50 focus:outline-none"
          )}
          onclick={handleProgressClick}
          onmousedown={handleProgressMouseDown}
          onmousemove={handleProgressMouseMove}
          onmouseenter={() => (isHovering = true)}
          onmouseleave={() => (isHovering = false)}
          aria-valuemin={0}
          aria-valuemax={playerState.duration}
          aria-valuenow={playerState.currentTime}
          aria-valuetext={`${makeTimeString(playerState.currentTime)} / ${makeTimeString(playerState.duration)}`}
            onkeydown={(ev) => {
            const e = ev as KeyboardEvent;
            if (!playerState.duration) return;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              const newTime = Math.max(0, playerState.currentTime - SEEK_TIME_STEP);
              playerState.currentTime = newTime;
              if (playerState.videoElement) playerState.videoElement.currentTime = newTime;
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              const newTime = Math.min(playerState.duration, playerState.currentTime + SEEK_TIME_STEP);
              playerState.currentTime = newTime;
              if (playerState.videoElement) playerState.videoElement.currentTime = newTime;
            } else if (e.key === 'Home') {
              e.preventDefault();
              playerState.currentTime = 0;
              if (playerState.videoElement) playerState.videoElement.currentTime = 0;
            } else if (e.key === 'End') {
              e.preventDefault();
              playerState.currentTime = playerState.duration;
              if (playerState.videoElement) playerState.videoElement.currentTime = playerState.duration;
            }
          }}
          role="slider"
          tabindex={0}
        >
          <div class="absolute inset-0 rounded-full bg-white/10"></div>

          <div
            class={cn(
              "absolute top-0 left-0 h-full rounded-full bg-white shadow-sm",
              !isDragging && "transition-all duration-100 ease-out"
            )}
            style="width: {smoothProgressPercentage}%"
          ></div>

          {#if isDragging && playerState.duration}
            <div
              class="pointer-events-none absolute -top-10 z-30 flex justify-center"
              style="left: calc({((dragTime ?? playerState.currentTime) /
                (playerState.duration || 1)) *
                100}% - 2rem)"
            >
              <div
                class="rounded-lg bg-black/90 px-3 py-1.5 text-sm font-medium text-white shadow-xl backdrop-blur-sm"
              >
                {makeTimeString(dragTime ?? playerState.currentTime)}
              </div>
            </div>
          {:else if isHovering && !isDragging && playerState.duration > 0}
            <div
              class="pointer-events-none absolute -top-10 z-30 flex justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              style="left: calc({hoverPercentage}% - 2rem)"
            >
              <div
                class="rounded-lg bg-black/80 px-3 py-1.5 text-sm font-medium text-white/90 shadow-lg backdrop-blur-sm"
              >
                {makeTimeString(hoverTime)}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Control Buttons Section -->
  <div class="mt-6 px-6">
    <div class="flex w-full items-center justify-between">
      <!-- Left Controls -->
      <div class="flex items-center">
        <div class="flex items-center gap-1 rounded-xl bg-black/40 p-1 backdrop-blur-md">
          <PreviousButton />
          <PlayButton />
          <ForwardButton />
          <VolumeControl />
        </div>
      </div>

      <!-- Right Controls -->
      <div class="flex items-center gap-1 rounded-xl bg-black/40 p-1 backdrop-blur-md">
        <DropdownMenu>
          <DropdownMenuTrigger
            class="flex h-full items-center rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <TablerAspectRatio class="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            class="mr-4 w-40 border-none bg-black/70 text-white backdrop-blur-md"
          >
            <DropdownMenuGroup>
              <DropdownMenuItem
                class="flex cursor-pointer items-center justify-between focus:bg-white/10 focus:text-white"
                onclick={() => onAspectRatioChange("contain")}
              >
                <span>Contain</span>
                {#if aspectRatio === "contain"}
                  <div class="h-2 w-2 rounded-full bg-white"></div>
                {/if}
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center justify-between focus:bg-white/10 focus:text-white"
                onclick={() => onAspectRatioChange("cover")}
              >
                <span>Cover</span>
                {#if aspectRatio === "cover"}
                  <div class="h-2 w-2 rounded-full bg-white"></div>
                {/if}
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center justify-between focus:bg-white/10 focus:text-white"
                onclick={() => onAspectRatioChange("fill")}
              >
                <span>Fill</span>
                {#if aspectRatio === "fill"}
                  <div class="h-2 w-2 rounded-full bg-white"></div>
                {/if}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <SettingsButton />
        <FullScreenButton />
        <SideBarButton />
      </div>
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for consistency */
  #media-controls * {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  }

  #media-controls *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  #media-controls *::-webkit-scrollbar-track {
    background: transparent;
  }

  #media-controls *::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  #media-controls *::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.5);
  }

  #media-controls [role="slider"] {
    transition: all 0.2s ease-out;
  }

  #media-controls [role="slider"]:focus-visible {
    outline: 2px solid rgba(59, 130, 246, 0.6);
    outline-offset: 2px;
  }
</style>
