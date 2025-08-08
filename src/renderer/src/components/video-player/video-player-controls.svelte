<script lang="ts">
  import { makeTimeString } from "$lib/makeTimeString";
  import { playerState } from "$lib/state/player.svelte";
  import { cn } from "$lib/utils";
  import PlayButton from "./controls/PlayButton.svelte";
  import PreviousButton from "./controls/PreviousButton.svelte";
  import ForwardButton from "./controls/ForwardButton.svelte";
  import VolumeControl from "./controls/VolumeControl.svelte";
  import SettingsButton from "./controls/SettingsButton.svelte";
  import FullScreenButton from "./controls/FullScreenButton.svelte";
  import SideBarButton from "./controls/SideBarButton.svelte";

  let isDragging = $state(false);
  let hoverTime = $state(0);
  let isHovering = $state(false);

  let smoothProgressPercentage = $state(0);
  let animationFrameId: number | null = null;

  const lerp = (start: number, end: number, factor: number): number =>
    start + (end - start) * factor;

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
          await playerState.videoElement.play();
        } else {
          const onCanPlay = async (): Promise<void> => {
            await playerState.videoElement?.play();
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

  const progressPercentage = $derived(
    isDragging || !playerState.duration
      ? (playerState.currentTime / playerState.duration) * 100 || 0
      : smoothProgressPercentage
  );

  const hoverPercentage = $derived(
    playerState.duration > 0 ? (hoverTime / playerState.duration) * 100 : 0
  );
</script>

<div class="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-2">
  <div class="mx-4 mb-2">
    <div
      class="relative z-10 flex items-center justify-between px-1 pb-1.5 font-mono text-xs text-neutral-300 select-none"
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
        "group relative h-1.5 rounded-full bg-neutral-700/30 lg:h-2",
        isDragging
          ? "bg-neutral-900/80 shadow-inner shadow-neutral-500/20"
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
        class={cn("absolute h-1.5 grow rounded-full bg-neutral-100 lg:h-2", {
          "transition-all duration-75 ease-linear": !isDragging
        })}
        style="width: {progressPercentage > 0 ? Math.max(progressPercentage, 0.5) : 0}%"
      ></div>
      {#if isHovering && !isDragging && playerState.duration > 0}
        <div
          class="absolute bottom-6 z-10 rounded border border-neutral-700/50 bg-neutral-900/95 px-2 py-1 text-xs text-neutral-100 shadow-xl backdrop-blur-sm"
          style="left: {hoverPercentage}%; transform: translateX(-50%)"
        >
          {makeTimeString(hoverTime)}
          <div
            class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-2 border-r-2 border-l-2 border-transparent border-t-neutral-900/95"
          ></div>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex items-center justify-between px-4">
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-1 rounded px-1 py-0.5 backdrop-blur-sm">
        <PreviousButton />
        <PlayButton />
        <ForwardButton />
        <VolumeControl />
      </div>
    </div>

    <div class="flex items-center gap-1 rounded px-1 py-0.5 backdrop-blur-sm">
      <SettingsButton />
      <FullScreenButton />
      <SideBarButton />
    </div>
  </div>
</div>
