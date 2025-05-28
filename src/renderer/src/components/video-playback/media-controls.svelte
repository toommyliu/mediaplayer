<script lang="ts">
  import { Button } from "@/components/ui/button";
  import * as Tooltip from "@/components/ui/tooltip";
  import { ICON_SIZE } from "@/constants";
  import { playerState, sidebarState } from "@/state.svelte";
  import { makeTimeString } from "@/utils/time";
  import { cn } from "@/utils/utils";
  import Maximize from "lucide-svelte/icons/maximize";
  import Menu from "lucide-svelte/icons/menu";
  import Pause from "lucide-svelte/icons/pause";
  import Play from "lucide-svelte/icons/play";
  import SkipBack from "lucide-svelte/icons/skip-back";
  import SkipForward from "lucide-svelte/icons/skip-forward";
  import Volume1 from "lucide-svelte/icons/volume-1";
  import Volume2 from "lucide-svelte/icons/volume-2";
  import VolumeX from "lucide-svelte/icons/volume-x";

  let isDragging = $state(false);
  let hoverTime = $state(0);
  let isHovering = $state(false);
  let bufferedPercentage = $state(0);
  let isVolumeHovering = $state(false);
  let isVolumeDragging = $state(false);

  $effect(() => {
    if (!playerState.videoElement || !playerState.duration) return undefined;

    const updateBuffered = (): void => {
      if (playerState.videoElement.buffered.length > 0) {
        const bufferedEnd = playerState.videoElement.buffered.end(
          playerState.videoElement.buffered.length - 1
        );
        bufferedPercentage = Math.min(100, (bufferedEnd / playerState.duration) * 100);
      }
    };
    const handleProgress = (): void => updateBuffered();

    playerState.videoElement.addEventListener("progress", handleProgress);
    updateBuffered();

    return () => {
      playerState.videoElement.removeEventListener("progress", handleProgress);
    };
  });

  const handleSeek = (ev: MouseEvent, progressBar?: HTMLElement, barRect?: DOMRect): void => {
    if (!playerState.videoElement || !playerState.duration) return;

    const target = progressBar || (ev.currentTarget as HTMLElement);
    if (!target) return;

    // Use cached rect if provided (during drag), otherwise get a fresh one
    const rect = barRect || target.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    const newTime = percent * playerState.duration;

    // Update state for visual feedback
    playerState.currentTime = newTime;

    // Always update video time for real-time scrubbing
    try {
      playerState.videoElement.currentTime = newTime;
    } catch (error) {
      console.error("Error seeking video:", error);
    }
  };

  const handleProgressKeyDown = (ev: KeyboardEvent): void => {
    if (!playerState.videoElement || !playerState.duration) return;

    const step = playerState.duration * 0.05; // 5% of video duration
    let handled = false;

    switch (ev.key) {
      case "ArrowLeft":
        seekRelative(-step);
        handled = true;
        break;
      case "ArrowRight":
        seekRelative(step);
        handled = true;
        break;
      case "Home":
        seekTo(0);
        handled = true;
        break;
      case "End":
        seekTo(playerState.duration);
        handled = true;
        break;
    }

    if (handled) {
      ev.preventDefault();
    }
  };

  const handleProgressClick = (ev: MouseEvent): void => {
    // Only handle clicks if we're not dragging
    if (isDragging) return;

    // Click updates both UI and video time
    handleSeek(ev);
  };

  const handleProgressMouseDown = (ev: MouseEvent): void => {
    if (!playerState.videoElement || !playerState.duration) return;

    ev.preventDefault();
    isDragging = true;
    const wasPlaying = playerState.isPlaying;
    const progressBar = ev.currentTarget as HTMLElement;
    // Cache the progress bar dimensions to avoid repeated DOM queries
    const barRect = progressBar.getBoundingClientRect();

    // Initial seek with video update
    handleSeek(ev, progressBar, barRect);

    // Use requestAnimationFrame for smoother updates
    let lastClientX = ev.clientX;
    let frameId: number | null = null;
    const performSeekUpdate = (): void => {
      // Create a fake event object with the cached clientX
      const fakeEvent = { clientX: lastClientX } as MouseEvent;

      // Perform the seek (update both UI and video)
      handleSeek(fakeEvent, progressBar, barRect);

      frameId = null;
    };

    const handleMouseMove = (e: MouseEvent): void => {
      if (isDragging) {
        lastClientX = e.clientX;

        // Only schedule a new update if one isn't already pending
        if (frameId === null) {
          frameId = requestAnimationFrame(performSeekUpdate);
        }

        e.preventDefault();
      }
    };

    const handleMouseUp = (): void => {
      isDragging = false;

      // Cancel any pending animation frame
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      // Immediately resume playback if it was playing before
      if (wasPlaying && playerState.videoElement) {
        // Check if video is ready to play
        if (playerState.videoElement.readyState >= 2) {
          playerState.videoElement.play().catch((error) => {
            console.error("Error resuming playback after seek:", error);
          });
        } else {
          // If video is not ready yet, add a 'canplay' event listener
          const onCanPlay = () => {
            playerState.videoElement?.play().catch((error) => {
              console.error("Error resuming playback after seek:", error);
            });
            playerState.videoElement?.removeEventListener("canplay", onCanPlay);
          };
          playerState.videoElement.addEventListener("canplay", onCanPlay);
        }
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleProgressMouseMove = (ev: MouseEvent): void => {
    if (!playerState.duration || isDragging) return;

    // Don't update hover time too frequently for performance
    const progressBar = ev.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));

    // Only update if there's a significant change (reduces DOM updates)
    const newHoverTime = percent * playerState.duration;
    if (Math.abs(hoverTime - newHoverTime) > 0.1) {
      hoverTime = newHoverTime;
    }
  };

  const seekRelative = (seconds: number): void => {
    if (!playerState.videoElement) return;
    const newTime = Math.max(0, Math.min(playerState.duration, playerState.currentTime + seconds));
    seekTo(newTime);
  };

  const seekTo = (time: number): void => {
    if (!playerState.videoElement) return;
    const clampedTime = Math.max(0, Math.min(playerState.duration, time));

    try {
      playerState.videoElement.currentTime = clampedTime;
      // Update state for immediate feedback
      playerState.currentTime = clampedTime;
    } catch (error) {
      console.error("Error seeking to time:", error);
    }
  };

  const togglePlay = (): void => {
    if (!playerState.videoElement || !playerState.currentVideo) return;

    if (playerState.isPlaying) {
      playerState.videoElement.pause();
      playerState.isPlaying = false;
    } else {
      playerState.videoElement.play().catch((error) => {
        console.error("Error playing video:", error);
      });
      playerState.isPlaying = true;
    }
  };

  const toggleMute = (): void => {
    playerState.isMuted = !playerState.isMuted;
    if (playerState.videoElement) {
      playerState.videoElement.muted = playerState.isMuted;
      playerState.videoElement.volume = playerState.isMuted ? 0 : playerState.volume;
    }
  };

  const handleVolumeSeek = (ev: MouseEvent, volumeBar?: HTMLElement): void => {
    const target = volumeBar || (ev.currentTarget as HTMLElement);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));

    // Update state immediately for responsive feedback
    // Only update the DOM once, not on every calculated value
    const newVolume = percent;
    const newMuted = percent === 0;

    // Batch updates to minimize DOM operations
    if (playerState.volume !== newVolume || playerState.isMuted !== newMuted) {
      playerState.volume = newVolume;
      playerState.isMuted = newMuted;

      if (playerState.videoElement) {
        playerState.videoElement.volume = newVolume;
        playerState.videoElement.muted = newMuted;
      }
    }
  };

  const handleVolumeMouseDown = (ev: MouseEvent): void => {
    ev.preventDefault();
    isVolumeDragging = true;
    const volumeBar = ev.currentTarget as HTMLElement;

    // Initial seek
    handleVolumeSeek(ev, volumeBar);

    // Use requestAnimationFrame for smoother performance during dragging
    let lastClientX = ev.clientX;
    let rafId: number | null = null;
    const barRect = volumeBar.getBoundingClientRect();

    const performVolumeUpdate = (): void => {
      // Calculate percent based on the cached width instead of getting getBoundingClientRect() on every frame
      const percent = Math.max(0, Math.min(1, (lastClientX - barRect.left) / barRect.width));

      // Only update if changed - reduces unnecessary DOM updates
      if (playerState.volume !== percent) {
        playerState.volume = percent;
        playerState.isMuted = percent === 0;

        if (playerState.videoElement) {
          playerState.videoElement.volume = percent;
          playerState.videoElement.muted = percent === 0;
        }
      }

      rafId = null;
    };

    const handleMouseMove = (e: MouseEvent): void => {
      if (isVolumeDragging) {
        lastClientX = e.clientX;

        // Only schedule a new update if one isn't already pending
        if (rafId === null) {
          rafId = requestAnimationFrame(performVolumeUpdate);
        }

        e.preventDefault();
      }
    };

    const handleMouseUp = (): void => {
      isVolumeDragging = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleVolumeClick = (ev: MouseEvent): void => {
    if (isVolumeDragging) return;
    handleVolumeSeek(ev);
  };

  const toggleFullscreen = (): void => {
    if (!document.fullscreenElement) {
      playerState.videoElement?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const skipBackward = (): void => seekRelative(-10);
  const skipForward = (): void => seekRelative(10);

  // Calculate progress percentage - use derived state for reactivity
  const progressPercentage = $derived(
    playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0
  );

  const hoverPercentage = $derived(
    playerState.duration > 0 ? (hoverTime / playerState.duration) * 100 : 0
  );
</script>

<div
  class={cn(
    "relative h-auto w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-all duration-300",
    "border-t border-white/10 backdrop-blur-sm",
    !playerState.showControls &&
      playerState.isPlaying &&
      !isDragging &&
      "pointer-events-none opacity-0",
    (playerState.showControls || !playerState.isPlaying || isDragging) && "opacity-100"
  )}
>
  <!-- Progress Bar Section -->
  <div class="mb-4">
    <div
      class={cn(
        "group relative h-2 cursor-pointer rounded-full bg-white/20",
        !isDragging && "transition-colors duration-200",
        isDragging && "bg-white/30 shadow-inner shadow-blue-500/30"
      )}
      onclick={handleProgressClick}
      onkeydown={handleProgressKeyDown}
      onmousedown={handleProgressMouseDown}
      onmousemove={handleProgressMouseMove}
      onmouseenter={() => (isHovering = true)}
      onmouseleave={() => (isHovering = false)}
      role="slider"
      aria-label="Video progress"
      aria-valuemin={0}
      aria-valuemax={playerState.duration}
      aria-valuenow={playerState.currentTime}
      aria-valuetext={`${makeTimeString(playerState.currentTime)} of ${makeTimeString(playerState.duration)}`}
      tabindex={0}
    >
      <!-- Buffered progress -->
      <div
        class="absolute inset-0 h-full rounded-full bg-white/30"
        class:transition-all={!isDragging}
        style="width: {bufferedPercentage}%"
        aria-hidden="true"
      ></div>

      <!-- Current progress -->
      <div
        class="absolute inset-0 h-full rounded-full bg-blue-500"
        class:transition-all={!isDragging}
        class:duration-200={!isDragging}
        style="width: {progressPercentage}%"
        aria-hidden="true"
      ></div>

      <!-- Progress thumb -->
      {#if playerState.duration > 0}
        <div
          class={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full shadow-lg",
            "border-2 border-white/50 bg-blue-500 shadow-blue-300/50",
            !isDragging && "transition-all duration-200",
            isDragging
              ? "scale-150 border-white opacity-100 shadow-lg shadow-blue-500/50"
              : isHovering
                ? "scale-125 opacity-100"
                : "scale-100 opacity-0"
          )}
          style="left: {progressPercentage}%; transform: translateX(-50%) translateY(-50%)"
          aria-hidden="true"
        ></div>
      {/if}

      <!-- Hover time tooltip -->
      {#if isHovering && !isDragging && playerState.duration > 0}
        <div
          class="absolute bottom-8 z-10 rounded-md bg-black/90 px-2 py-1 text-xs text-white shadow-lg backdrop-blur-sm"
          style="left: {hoverPercentage}%; transform: translateX(-50%)"
          aria-hidden="true"
        >
          {makeTimeString(hoverTime)}
          <div
            class="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90"
          ></div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Controls Section -->
  <div class="flex items-center justify-between gap-4">
    <!-- Left Controls -->
    <div class="flex items-center gap-3">
      <!-- Skip Backward -->
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onclick={skipBackward}
            class="h-9 w-9 text-white hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
            disabled={!playerState.currentVideo || playerState.isLoading}
            aria-label="Skip backward 10 seconds"
          >
            <SkipBack size={ICON_SIZE} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Skip backward 10s</p>
        </Tooltip.Content>
      </Tooltip.Root>

      <!-- Play/Pause -->
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onclick={togglePlay}
            class="h-10 w-10 text-white hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
            disabled={!playerState.currentVideo || playerState.isLoading}
            aria-label={playerState.isPlaying ? "Pause video" : "Play video"}
          >
            {#if playerState.isLoading}
              <div
                class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></div>
            {:else if playerState.isPlaying}
              <Pause size={ICON_SIZE} />
            {:else}
              <Play size={ICON_SIZE} />
            {/if}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{playerState.isPlaying ? "Pause (Space)" : "Play (Space)"}</p>
        </Tooltip.Content>
      </Tooltip.Root>

      <!-- Skip Forward -->
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onclick={skipForward}
            class="h-9 w-9 text-white hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
            disabled={!playerState.currentVideo || playerState.isLoading}
            aria-label="Skip forward 10 seconds"
          >
            <SkipForward size={ICON_SIZE} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Skip forward 10s</p>
        </Tooltip.Content>
      </Tooltip.Root>

      <!-- Time Display -->
      <div class="flex items-center gap-1 font-mono text-sm text-white/90">
        <time>{makeTimeString(playerState.currentTime)}</time>
        <span class="text-white/60">/</span>
        <time>{makeTimeString(playerState.duration)}</time>
      </div>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center gap-2">
      <!-- Volume Controls -->
      <div
        class="volume-controls group flex items-center gap-2"
        onmouseenter={() => (isVolumeHovering = true)}
        onmouseleave={() => {
          if (!isVolumeDragging) {
            isVolumeHovering = false;
          }
        }}
      >
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onclick={toggleMute}
              class="h-9 w-9 text-white hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
              aria-label={playerState.isMuted ? "Unmute (M)" : "Mute (M)"}
            >
              {#if playerState.isMuted || playerState.volume === 0}
                <VolumeX size={ICON_SIZE} />
              {:else if playerState.volume <= 0.33}
                <Volume1 size={ICON_SIZE} />
              {:else}
                <Volume2 size={ICON_SIZE} />
              {/if}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>{playerState.isMuted ? "Unmute (M)" : "Mute (M)"}</p>
          </Tooltip.Content>
        </Tooltip.Root>

        <div
          class={cn(
            "relative",
            !isVolumeDragging && "transition-all duration-150",
            isVolumeHovering || isVolumeDragging
              ? "w-20 opacity-100"
              : "w-0 opacity-0 md:w-20 md:opacity-100"
          )}
          style="overflow: visible;"
        >
          <div
            class={cn(
              "group relative h-2 cursor-pointer rounded-full bg-white/20",
              !isVolumeDragging && "transition-colors duration-200",
              isVolumeDragging && "bg-white/30"
            )}
            onclick={handleVolumeClick}
            onmousedown={handleVolumeMouseDown}
            role="slider"
            aria-label="Volume control"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={playerState.isMuted ? 0 : playerState.volume}
            aria-valuetext={`Volume ${Math.round((playerState.isMuted ? 0 : playerState.volume) * 100)}%`}
            tabindex={0}
            style="overflow: visible;"
          >
            <!-- Volume filled track -->
            <div
              class="absolute inset-0 h-full rounded-full bg-blue-500"
              class:transition-all={!isVolumeDragging}
              class:duration-100={!isVolumeDragging}
              style="width: {(playerState.isMuted ? 0 : playerState.volume) * 100}%"
              aria-hidden="true"
            ></div>

            <!-- Volume thumb -->
            <div
              class={cn(
                "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full shadow-lg",
                "border-2 border-white/50 bg-blue-500 shadow-blue-300/50",
                !isVolumeDragging && "transition-all duration-100",
                isVolumeDragging || isVolumeHovering
                  ? "scale-125 opacity-100"
                  : "scale-100 opacity-0"
              )}
              style="left: {(playerState.isMuted ? 0 : playerState.volume) *
                100}%; transform: translateX(-50%) translateY(-50%); z-index: 10;"
              aria-hidden="true"
            ></div>
          </div>
        </div>
      </div>

      <!-- Fullscreen -->
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onclick={toggleFullscreen}
            class="h-9 w-9 text-white hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
            aria-label="Toggle fullscreen"
          >
            <Maximize size={ICON_SIZE} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Fullscreen</p>
        </Tooltip.Content>
      </Tooltip.Root>

      <!-- Sidebar Toggle -->
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onclick={() => (sidebarState.isOpen = !sidebarState.isOpen)}
            class={cn(
              "h-9 w-9 text-white hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400",
              sidebarState.isOpen && "bg-white/20 text-blue-400"
            )}
            aria-label={sidebarState.isOpen ? "Hide sidebar" : "Show sidebar"}
            aria-pressed={sidebarState.isOpen}
          >
            <Menu size={ICON_SIZE} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{sidebarState.isOpen ? "Hide sidebar" : "Show sidebar"}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </div>
</div>
