<script lang="ts">
  import FastForward from "lucide-svelte/icons/fast-forward";
  import Maximize from "lucide-svelte/icons/maximize";
  import Menu from "lucide-svelte/icons/menu";
  import Minimize from "lucide-svelte/icons/minimize";
  import Pause from "lucide-svelte/icons/pause";
  import Play from "lucide-svelte/icons/play";
  import Rewind from "lucide-svelte/icons/rewind";
  import IconSettings from "lucide-svelte/icons/settings";
  import Volume1 from "lucide-svelte/icons/volume-1";
  import Volume2 from "lucide-svelte/icons/volume-2";
  import VolumeX from "lucide-svelte/icons/volume-x";
  import { client } from "$/tipc";
  import { ICON_SIZE } from "$lib/constants";
  import { makeTimeString } from "$lib/makeTimeString";
  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
  import { sidebarState } from "$lib/state/sidebar.svelte";
  import { volume } from "$lib/state/volume.svelte";
  import { cn } from "$lib/utils";
  import { playNextVideo, playPreviousVideo, playVideoElement } from "$lib/video-playback";
  import Button from "$ui/button/button.svelte";
  import * as Tooltip from "$ui/tooltip/";
  import { fade } from "svelte/transition";
  import PlayButton from "./controls/PlayButton.svelte";
  import PreviousButton from "./controls/PreviousButton.svelte";
  import ForwardButton from "./controls/ForwardButton.svelte";
  import VolumeControl from "./controls/VolumeControl.svelte";
  import SettingsButton from "./controls/SettingsButton.svelte";
  import FullScreenButton from "./controls/FullScreenButton.svelte";

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

  const toggleMute = (): void => {
    volume.isMuted = !volume.isMuted;

    if (playerState.videoElement) {
      playerState.videoElement.muted = volume.isMuted;
      playerState.videoElement.volume = volume.isMuted ? 0 : volume.value;
    }
  };

  const handleVolumeSeek = (ev: MouseEvent, volumeBar?: HTMLElement): void => {
    const target = volumeBar ?? (ev.currentTarget as HTMLElement);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));

    const newVolume = percent;
    const newMuted = percent === 0;

    if (volume.value !== newVolume || volume.isMuted !== newMuted) {
      volume.value = newVolume;
      volume.isMuted = newMuted;
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

      if (volume.value !== percent) {
        volume.value = percent;
        volume.isMuted = percent === 0;
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

  const hoverPercentage = $derived(
    playerState.duration > 0 ? (hoverTime / playerState.duration) * 100 : 0
  );
</script>

{#if showOverlay}
  <div
    class="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 to-transparent pt-16 pb-6"
    transition:fade={{ duration: 300 }}
  >
    <div class="mx-8 mb-4">
      <div
        class="relative z-10 flex items-center justify-between px-1 pb-2 font-mono text-xs text-white select-none"
      >
        <span>{makeTimeString(playerState.currentTime)}</span>
        <span>
          {#if playerState.duration}
            -{makeTimeString(Math.max(0, playerState.duration - playerState.currentTime))}
          {:else}
            -0:00
          {/if}
        </span>
      </div>
      <div
        class={cn(
          "group relative h-2 rounded-full bg-white/20 lg:h-3",
          isDragging
            ? "bg-black/70 shadow-inner shadow-blue-500/30"
            : "transition-colors duration-200"
        )}
        onclick={handleProgressClick}
        onmousedown={handleProgressMouseDown}
        onmousemove={handleProgressMouseMove}
        onmouseenter={() => (isHovering = true)}
        onmouseleave={() => (isHovering = false)}
        role="slider"
        tabindex={0}
      >
        <div
          class={cn("absolute h-2 grow rounded-full bg-white lg:h-3", {
            "transition-all duration-75 ease-linear": !isDragging
          })}
          style="width: {progressPercentage > 0 ? Math.max(progressPercentage, 0.5) : 0}%"
        ></div>
        {#if isHovering && !isDragging && playerState.duration > 0}
          <div
            class="absolute bottom-8 z-10 rounded-md bg-black/90 px-2 py-1 text-xs text-white shadow-lg"
            style="left: {hoverPercentage}%; transform: translateX(-50%)"
          >
            {makeTimeString(hoverTime)}
            <div
              class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-2 border-r-2 border-l-2 border-transparent border-t-black/90"
            ></div>
          </div>
        {/if}
      </div>
    </div>

    <div class="flex items-center justify-between px-8">
      <div class="flex items-center gap-4">
        <div class="flex grow items-center gap-2 rounded-md bg-black/50 backdrop-blur-md">
          <PreviousButton />
          <PlayButton />
          <ForwardButton />
          <VolumeControl />
        </div>
      </div>

      <!-- Right Controls -->
      <div class="flex items-center gap-2">
        <SettingsButton />
        <FullScreenButton />

        <!-- Sidebar Toggle -->
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="ghost"
                size="icon"
                onclick={() => (sidebarState.isOpen = !sidebarState.isOpen)}
                class={cn(
                  "h-8 w-8 rounded-full text-white transition-all duration-200 hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400",
                  sidebarState.isOpen && "bg-blue-500/20 text-blue-400"
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
    </div>
  </div>
{/if}
