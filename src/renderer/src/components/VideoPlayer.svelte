<script lang="ts">
  import { playerState } from "@/state.svelte";
  import { cn } from "@/utils/utils";
  import { loadVideoDialog } from "@/utils/ipc";
  import { makeTimeString } from "@/utils/time";
  import MediaControls from "./video-playback/MediaControls.svelte";
  interface Props {
    videoElement?: HTMLVideoElement;
  }

  let { videoElement = $bindable() }: Props = $props();

  let controlsTimeout: number | null = null;

  function onLoading(loading: boolean): void {
    playerState.isLoading = loading;
  }

  function onError(message: string): void {
    playerState.error = message;
    playerState.isLoading = false;
  }

  function handleLoadStart(): void {
    console.log("Video load started");
    onLoading(true);
  }

  function handleLoadedData(): void {
    console.log("Video data loaded");
    onLoading(false);
    if (videoElement) {
      playerState.duration = videoElement.duration;
      videoElement.play().catch((error) => {
        console.error("Auto-play failed:", error);
      });
    }
  }

  function handleLoadedMetadata(): void {
    console.log("Video metadata loaded");
    if (videoElement) {
      playerState.duration = videoElement.duration;
    }
  }

  function handleTimeUpdate(): void {
    if (videoElement) {
      playerState.currentTime = videoElement.currentTime;
    }
  }

  function handleSeeked(): void {
    if (videoElement) {
      playerState.currentTime = videoElement.currentTime;
    }
  }

  function handleError(event: Event): void {
    console.error("Video error:", event);
    const target = event.target as HTMLVideoElement;
    let errorMessage = "Unknown video error";

    if (target.error) {
      switch (target.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Video loading was aborted";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Network error while loading video";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Video format not supported or corrupted";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Video format not supported";
          break;
        default:
          errorMessage = `Video error: ${target.error.message || "Unknown error"}`;
      }
    }

    onError(errorMessage);
    onLoading(false);
  }

  function handleCanPlay(): void {
    // console.log("Video can start playing");
    onLoading(false);
  }

  function handlePlay(): void {
    if (!videoElement || !playerState.currentVideo) return;

    playerState.isPlaying = true;
  }

  function handlePause(): void {
    playerState.isPlaying = false;
  }

  function handleFullscreenChange(): void {
    // isFullscreen = !!document.fullscreenElement;
  }

  function showControlsTemporarily(): void {
    playerState.showControls = true;
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    controlsTimeout = setTimeout(() => {
      if (playerState.isPlaying) {
        playerState.showControls = false;
      }
    }, 3000) as unknown as number;
  }

  function handleMouseMove(): void {
    showControlsTemporarily();
  }

  function handleClick(): void {
    const videoContainer = document.getElementById("video-player");
    if (videoContainer) {
      videoContainer.focus();
    }
  }

  function handleDblClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;

    const controlsElement = target.closest("#media-controls");
    if (controlsElement) {
      return;
    }

    if (target.tagName === "VIDEO" || target.id === "video-player") {
      if (playerState.isPlaying) {
        console.log("Double click while playing...");
      } else {
        loadVideoDialog();
      }
    }
  }

  $effect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  });

  $effect(() => {
    if (!playerState.isPlaying) {
      playerState.showControls = true;
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    }
  });

  $effect(() => {
    if (videoElement) {
      videoElement.volume = playerState.isMuted ? 0 : playerState.volume;
      videoElement.muted = playerState.isMuted;
      playerState.videoElement = videoElement;
    }
  });
</script>

<div class="flex h-full w-full flex-col bg-black">
  <!-- Video container -->
  <div
    class={cn(
      "group relative flex h-[90%] w-full flex-1 items-center justify-center bg-black",
      !playerState.currentVideo && "cursor-pointer transition-all duration-300 hover:bg-gray-800"
    )}
    onmousemove={handleMouseMove}
    onclick={handleClick}
    ondblclick={handleDblClick}
    id="video-player"
  >
    {#if playerState.currentVideo}
      <video
        bind:this={videoElement}
        src={playerState.currentVideo}
        class="video-no-controls max-h-full max-w-full object-contain"
        onloadstart={handleLoadStart}
        onloadeddata={handleLoadedData}
        onloadedmetadata={handleLoadedMetadata}
        ontimeupdate={handleTimeUpdate}
        onseeked={handleSeeked}
        onerror={handleError}
        oncanplay={handleCanPlay}
        onplay={handlePlay}
        onpause={handlePause}
        preload="metadata"
        crossorigin="anonymous"
        controls={false}
        controlslist="nodownload nofullscreen noremoteplayback"
        disablepictureinpicture
      >
      </video>

      <!-- Hover overlay -->
      <div
        class="absolute left-4 top-4 rounded-lg bg-black bg-opacity-70 p-3 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      >
        <div class="text-sm font-medium">
          {playerState.currentVideo?.split("/").pop() || "Unknown"}
        </div>
        <div class="mt-1 text-xs text-gray-300">
          {makeTimeString(playerState.currentTime)} / {makeTimeString(playerState.duration)}
        </div>
        <div class="mt-1 text-xs text-gray-300">
          {playerState.isPlaying ? "Playing" : "Paused"} • Volume: {Math.round(
            playerState.volume * 100
          )}%{playerState.isMuted ? " (Muted)" : ""}
        </div>
      </div>
    {/if}
  </div>

  <MediaControls bind:videoElement />
</div>
