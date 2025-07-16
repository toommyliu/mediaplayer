<script lang="ts">
  import FastForward from "lucide-svelte/icons/fast-forward";
  import Maximize from "lucide-svelte/icons/maximize";
  import Menu from "lucide-svelte/icons/menu";
  import Minimize from "lucide-svelte/icons/minimize";
  import Pause from "lucide-svelte/icons/pause";
  import Play from "lucide-svelte/icons/play";
  import Rewind from "lucide-svelte/icons/rewind";
  import Settings from "lucide-svelte/icons/settings";
  import Volume1 from "lucide-svelte/icons/volume-1";
  import Volume2 from "lucide-svelte/icons/volume-2";
  import VolumeX from "lucide-svelte/icons/volume-x";
  import { playerState, sidebarState } from "$/state.svelte";
  import { client } from "$/tipc";
  import SettingsDialog from "$components/settings-dialog.svelte";
  import { ICON_SIZE } from "$lib/constants";
  import { makeTimeString } from "$lib/makeTimeString";
  import { cn } from "$lib/utils";
  import { playNextVideo, playPreviousVideo, playVideoElement } from "$lib/video-playback";
  import Button from "$ui/button/button.svelte";
  import * as Tooltip from "$ui/tooltip/";

  let isDragging = $state(false);
  let hoverTime = $state(0);
  let isHovering = $state(false);
  let bufferedPercentage = $state(0);
  let isVolumeHovering = $state(false);
  let isVolumeDragging = $state(false);
  let showSettingsDialog = $state(false);
  let smoothProgressPercentage = $state(0);
  let animationFrameId: number | null = null;

  const { showOverlay }: { showOverlay: boolean } = $props();

  const lerp = (start: number, end: number, factor: number): number =>
    start + (end - start) * factor;

  $effect(() => {
    if (!playerState.videoElement || !playerState.duration) return undefined;

    const updateBuffered = (): void => {
      if (playerState.videoElement && playerState.videoElement.buffered.length > 0) {
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
      if (playerState.videoElement) {
        playerState.videoElement.removeEventListener("progress", handleProgress);
      }
    };
  });

  // Smooth progress animation effect with lerp
  $effect(() => {
    if (!playerState.duration) {
      smoothProgressPercentage = 0;
      return;
    }

    const targetPercentage = (playerState.currentTime / playerState.duration) * 100;

    // If dragging, update immediately
    if (isDragging) {
      smoothProgressPercentage = targetPercentage;
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

    handleSeek(ev, progressBar, barRect);

    let lastClientX = ev.clientX;
    let frameId: number | null = null;
    const performSeekUpdate = (): void => {
      const fakeEvent = { clientX: lastClientX } as MouseEvent;

      handleSeek(fakeEvent, progressBar, barRect);

      frameId = null;
    };

    const handleMouseMove = (ev: MouseEvent): void => {
      if (isDragging) {
        lastClientX = ev.clientX;
        frameId ??= requestAnimationFrame(performSeekUpdate);
        ev.preventDefault();
      }
    };

    const handleMouseUp = async (): Promise<void> => {
      isDragging = false;

      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      if (wasPlaying && playerState.videoElement) {
        if (playerState.videoElement.readyState >= 2) {
          await playVideoElement();
        } else {
          const onCanPlay = async (): Promise<void> => {
            await playVideoElement();
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

    const progressBar = ev.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));

    const newHoverTime = percent * playerState.duration;
    if (Math.abs(hoverTime - newHoverTime) > 0.1) {
      hoverTime = newHoverTime;
    }
  };

  const togglePlay = async (): Promise<void> => {
    if (!playerState.videoElement || !playerState.currentVideo) return;

    if (playerState.isPlaying) {
      playerState.videoElement.pause();
      playerState.isPlaying = false;
    } else {
      await playVideoElement();
      // eslint-disable-next-line require-atomic-updates
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
    const target = volumeBar ?? (ev.currentTarget as HTMLElement);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));

    const newVolume = percent;
    const newMuted = percent === 0;

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

    handleVolumeSeek(ev, volumeBar);

    let rafId: number | null = null;

    const performVolumeUpdate = (clientX: number): void => {
      const rect = volumeBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

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

    const handleMouseMove = (ev: MouseEvent): void => {
      if (isVolumeDragging) {
        ev.preventDefault();
        rafId ??= requestAnimationFrame(() => performVolumeUpdate(ev.clientX));
      }
    };

    const handleMouseUp = (): void => {
      isVolumeDragging = false;

      // Reset hover state when drag ends
      if (!volumeBar.matches(":hover")) {
        isVolumeHovering = false;
      }

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
    if (playerState.isFullscreen) void client.exitFullscreen();
    else void client.enterFullscreen();

    playerState.isFullscreen = !playerState.isFullscreen;
  };

  const progressPercentage = $derived(
    isDragging || !playerState.duration
      ? (playerState.currentTime / playerState.duration) * 100 || 0
      : smoothProgressPercentage
  );
</script>

{#if showOverlay}
  <!-- Progress Bar - Floating at bottom -->
  <div class="absolute right-0 bottom-20 left-0 z-40 mx-8">
    <div
      class={cn(
        "group relative h-2 cursor-pointer rounded-full bg-black/50 backdrop-blur-sm",
        !isDragging && "transition-colors duration-200",
        isDragging && "bg-black/70 shadow-inner shadow-blue-500/30"
      )}
      onclick={handleProgressClick}
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
        class="absolute inset-0 h-full rounded-full bg-white/30 will-change-auto"
        style="width: {bufferedPercentage}%"
        aria-hidden="true"
      ></div>

      <!-- Current progress -->
      <div
        class="absolute inset-0 h-full rounded-full bg-blue-500 will-change-auto"
        class:transition-all={!isDragging}
        class:duration-75={!isDragging}
        class:ease-linear={!isDragging}
        style="width: {progressPercentage > 0 ? Math.max(progressPercentage, 0.5) : 0}%"
        aria-hidden="true"
      ></div>

      <!-- Progress thumb -->
      {#if playerState.duration > 0}
        <div
          class={cn(
            "absolute top-1/2 h-4 w-4 rounded-full shadow-lg will-change-transform",
            "border-2 border-white/50 bg-blue-500 shadow-blue-300/50",
            !isDragging && "transition-all duration-150 ease-out",
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
          class="absolute bottom-8 z-10 rounded-md bg-black/90 px-2 py-1 text-xs text-white shadow-lg backdrop-blur-xs will-change-transform"
          style="left: {hoverPercentage}%; transform: translateX(-50%)"
          aria-hidden="true"
        >
          {makeTimeString(hoverTime)}
          <div
            class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-2 border-r-2 border-l-2 border-transparent border-t-black/90"
          ></div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Bottom Left Controls - Playback controls and time display -->
  <div class="absolute bottom-6 left-6 z-40 flex items-center gap-2">
    <!-- Playback Controls Group -->
    <div class="flex items-center gap-2 rounded-md bg-black/50 px-3 py-1 backdrop-blur-md">
      <!-- Previous Track -->
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant="ghost"
              size="icon"
              onclick={playPreviousVideo}
              class="h-8 w-8 text-white transition-all duration-200 hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
              disabled={!playerState.currentVideo || playerState.isLoading}
            >
              <Rewind size={ICON_SIZE} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Previous track</p>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>

      <!-- Play/Pause -->
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant="ghost"
              size="icon"
              onclick={togglePlay}
              class="h-8 w-8 text-white transition-all duration-200 hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
              disabled={!playerState.currentVideo || playerState.isLoading}
              aria-label={playerState.isPlaying ? "Pause video" : "Play video"}
            >
              {#if playerState.isPlaying}
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
      </Tooltip.Provider>

      <!-- Next Track -->
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant="ghost"
              size="icon"
              onclick={playNextVideo}
              class="h-8 w-8 text-white transition-all duration-200 hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
              disabled={!playerState.currentVideo || playerState.isLoading}
            >
              <FastForward size={ICON_SIZE} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Next track</p>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>

    <!-- Volume Controls -->
    <div
      class="volume-controls group flex items-center gap-2 rounded-md bg-black/50 px-3 py-1 backdrop-blur-md"
      onmouseenter={() => (isVolumeHovering = true)}
      onmouseleave={() => {
        if (!isVolumeDragging) {
          isVolumeHovering = false;
        }
      }}
    >
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant="ghost"
              size="icon"
              onclick={toggleMute}
              class="h-8 w-8 text-white transition-all duration-200 hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
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
      </Tooltip.Provider>

      <div
        class={cn(
          "relative w-20 transition-opacity duration-150",
          isVolumeHovering || isVolumeDragging ? "opacity-100" : "opacity-70"
        )}
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
        >
          <div
            class={cn(
              "absolute inset-0 h-full rounded-full bg-blue-500",
              !isVolumeDragging && "transition-all duration-200"
            )}
            style="width: {(playerState.isMuted ? 0 : playerState.volume) * 100}%"
            aria-hidden="true"
          ></div>

          <div
            class={cn(
              "pointer-events-none absolute top-1/2 h-3 w-3 rounded-full shadow-lg",
              "border-2 border-white/50 bg-blue-500 shadow-blue-300/50",
              !isVolumeDragging && "transition-all duration-100",
              isVolumeDragging || isVolumeHovering ? "opacity-100" : "opacity-0"
            )}
            style="left: {(playerState.isMuted ? 0 : playerState.volume) *
              100}%; transform: translateX(-50%) translateY(-50%); z-index: 10;"
            aria-hidden="true"
          ></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Right Controls - Floating group -->
  <div class="absolute right-6 bottom-6 z-40 flex items-center gap-2">
    <!-- Settings -->
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button
            variant="ghost"
            size="icon"
            onclick={() => (showSettingsDialog = true)}
            class="h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-md transition-all duration-200 hover:bg-black/70 hover:text-blue-400 focus-visible:ring-blue-400"
            aria-label="Open settings"
          >
            <Settings size={ICON_SIZE} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Settings</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>

    <!-- Fullscreen -->
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button
            variant="ghost"
            size="icon"
            onclick={toggleFullscreen}
            class="h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-md transition-all duration-200 hover:bg-black/70 hover:text-blue-400 focus-visible:ring-blue-400"
            aria-label={playerState.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {#if playerState.isFullscreen}
              <Minimize size={ICON_SIZE} />
            {:else}
              <Maximize size={ICON_SIZE} />
            {/if}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Fullscreen</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>

    <!-- Sidebar Toggle -->
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button
            variant="ghost"
            size="icon"
            onclick={() => (sidebarState.isOpen = !sidebarState.isOpen)}
            class={cn(
              "h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-md transition-all duration-200 hover:bg-black/70 hover:text-blue-400 focus-visible:ring-blue-400",
              sidebarState.isOpen && "bg-black/70 text-blue-400"
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
    </Tooltip.Provider>
  </div>
{/if}

<SettingsDialog bind:open={showSettingsDialog} />
