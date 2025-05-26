<script lang="ts">
  import { playerState, sidebarState } from "@/state.svelte";
  import { makeTimeString } from "@/utils/time";

  interface Props {
    videoElement?: HTMLVideoElement;
  }

  let { videoElement }: Props = $props();
  let isDragging = $state(false);
  let hoverTime = $state(0);
  let isHovering = $state(false);
  let bufferedPercentage = $state(0);
  let isSeeking = $state(false);

  $effect(() => {
    if (!videoElement || !playerState.duration) return;

    const updateBuffered = () => {
      if (videoElement.buffered.length > 0) {
        const bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1);
        bufferedPercentage = (bufferedEnd / playerState.duration) * 100;
      }
    };

    const handleProgress = () => updateBuffered();
    const handleSeeking = () => {
      isSeeking = true;
    };
    const handleSeeked = () => {
      isSeeking = false;
    };

    videoElement.addEventListener("progress", handleProgress);
    videoElement.addEventListener("seeking", handleSeeking);
    videoElement.addEventListener("seeked", handleSeeked);
    updateBuffered();

    return () => {
      videoElement.removeEventListener("progress", handleProgress);
      videoElement.removeEventListener("seeking", handleSeeking);
      videoElement.removeEventListener("seeked", handleSeeked);
    };
  });

  const handleSeek = (ev: MouseEvent) => {
    if (!videoElement || !playerState.duration) return;

    const progressBar =
      ev.currentTarget instanceof HTMLElement
        ? (ev.currentTarget as HTMLElement)
        : ((ev.currentTarget as Document).querySelector(
            ".relative.h-1.cursor-pointer"
          ) as HTMLElement);

    if (!progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    const newTime = percent * playerState.duration;

    playerState.currentTime = newTime;

    try {
      videoElement.currentTime = newTime;
    } catch (error) {
      console.error("Error seeking video:", error);
    }
  };

  const handleMouseDown = (ev: MouseEvent) => {
    if (!videoElement || !playerState.duration) return;

    ev.preventDefault();
    isDragging = true;
    const wasPlaying = playerState.isPlaying;
    const progressBar = ev.currentTarget as HTMLElement;

    // if (wasPlaying) {
    //   videoElement.pause();
    // }

    handleSeek(ev);

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const syntheticEvent = new MouseEvent("mousemove", e);
        Object.defineProperty(syntheticEvent, "currentTarget", {
          get: () => progressBar
        });

        handleSeek(syntheticEvent);
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      isDragging = false;

      if (wasPlaying && videoElement.readyState >= 2) {
        videoElement.play().catch((error) => {
          console.error("Error resuming playback after seek:", error);
        });
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (ev: MouseEvent) => {
    if (!playerState.duration || isDragging) return;

    const progressBar = ev.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    hoverTime = percent * playerState.duration;
  };

  const handleMouseEnter = () => {
    isHovering = true;
  };

  const handleMouseLeave = () => {
    isHovering = false;
  };

  const handleKeyDown = (ev: KeyboardEvent) => {
    if (!videoElement || !playerState.duration) return;

    switch (ev.code) {
      case "ArrowLeft":
        ev.preventDefault();
        seekRelative(-5);
        break;
      case "ArrowRight":
        ev.preventDefault();
        seekRelative(5);
        break;
      case "Home":
        ev.preventDefault();
        seekTo(0);
        break;
      case "End":
        ev.preventDefault();
        seekTo(playerState.duration - 1);
        break;
    }
  };

  const seekRelative = (seconds: number) => {
    if (!videoElement) return;
    const newTime = Math.max(0, Math.min(playerState.duration, playerState.currentTime + seconds));
    seekTo(newTime);
  };

  const seekTo = (time: number) => {
    if (!videoElement) return;
    const clampedTime = Math.max(0, Math.min(playerState.duration, time));
    videoElement.currentTime = clampedTime;
    playerState.currentTime = clampedTime;
  };
  const togglePlay = () => {
    if (!videoElement || !playerState.currentVideo) return;

    if (playerState.isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play().catch((error) => {
        console.error("Error playing video:", error);
      });
    }
  };
  const toggleMute = () => {
    if (!videoElement || !playerState.currentVideo) return;

    playerState.isMuted = !playerState.isMuted;
    videoElement.muted = playerState.isMuted;

    videoElement.volume = playerState.isMuted ? 0 : playerState.volume;
  };
  const changeVolume = (ev: Event) => {
    if (!videoElement || !playerState.currentVideo) return;

    const target = ev.target as HTMLInputElement;
    const newVolume = Number.parseFloat(target.value);

    playerState.volume = newVolume;
    playerState.isMuted = newVolume === 0;

    videoElement.volume = newVolume;
    videoElement.muted = playerState.isMuted;
  };
</script>

<div
  class="w-full border-t bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300"
  style="height: 10%"
  class:opacity-0={!playerState.showControls && playerState.isPlaying}
  class:opacity-100={playerState.showControls || !playerState.isPlaying}
  id="media-controls"
>
  <div class="mb-4 flex items-center space-x-4">
    <!-- Playback progress bar -->
    <div class="relative flex-1">
      <div
        class="relative h-1 cursor-pointer rounded-full bg-gray-600 transition-all hover:h-2"
        class:h-2={isDragging}
        onmousedown={handleMouseDown}
        onmousemove={handleMouseMove}
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
        onkeydown={handleKeyDown}
        role="slider"
        tabindex="0"
        aria-label="Seek video"
        aria-valuemin="0"
        aria-valuemax={playerState.duration}
        aria-valuenow={playerState.currentTime}
      >
        <div
          class="absolute inset-0 h-full rounded-full bg-gray-500/50"
          style="width: {bufferedPercentage}%"
        ></div>
        <div
          class="absolute inset-0 h-full rounded-full bg-blue-500 transition-none"
          class:bg-yellow-500={isSeeking}
          class:transition-all={!isDragging}
          style="width: {playerState.duration > 0
            ? (playerState.currentTime / playerState.duration) * 100
            : 0}%"
        ></div>

        {#if playerState.duration > 0}
          <div
            class="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-blue-500 shadow-lg"
            class:opacity-0={!isDragging && !isHovering}
            class:opacity-100={isDragging || isHovering}
            class:scale-125={isDragging}
            class:bg-yellow-500={isSeeking}
            class:shadow-yellow-300={isSeeking}
            style="left: {(playerState.currentTime / playerState.duration) *
              100}%; transform: translateX(-50%) translateY(-50%)"
          ></div>
        {/if}

        {#if isHovering && !isDragging && playerState.duration > 0}
          <div
            class="absolute bottom-8 rounded bg-black/90 px-2 py-1 text-xs text-white shadow-lg backdrop-blur-sm"
            style="left: {(hoverTime / playerState.duration) * 100}%; transform: translateX(-50%)"
          >
            {makeTimeString(hoverTime)}
            <div
              class="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"
            ></div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Volume bar -->
    <div class="flex items-center space-x-2">
      <button
        onclick={toggleMute}
        class="text-lg text-white transition-colors hover:text-blue-400 focus:text-blue-400 focus:outline-none"
      >
        {playerState.isMuted || playerState.volume === 0
          ? "🔇"
          : playerState.volume < 0.5
            ? "🔉"
            : "🔊"}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={playerState.isMuted ? 0 : playerState.volume}
        oninput={changeVolume}
        class="slider h-1 w-20 cursor-pointer appearance-none rounded-lg bg-gray-600"
      />
    </div>
  </div>

  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <button
        onclick={togglePlay}
        class="text-2xl text-white transition-colors hover:text-blue-400 focus:text-blue-400 focus:outline-none"
      >
        {playerState.isPlaying ? "⏸️" : "▶️"}
      </button>

      <div class="font-mono text-sm text-white">
        <span>{makeTimeString(playerState.currentTime)}</span>
        <span class="mx-1">/</span>
        <span>{makeTimeString(playerState.duration)}</span>
      </div>
    </div>

    <div class="flex items-center">
      <button
        onclick={() => (sidebarState.isOpen = !sidebarState.isOpen)}
        class="rounded-full bg-gray-700/50 p-2 text-white/70 opacity-60 transition-all hover:bg-gray-600/50 hover:text-white hover:opacity-100"
        title={sidebarState.isOpen ? "Hide sidebar" : "Show sidebar"}
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  </div>
</div>
