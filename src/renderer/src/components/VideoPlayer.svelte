<script lang="ts">
  import { playerState } from "@/state.svelte";
  import { makeTimeString } from "@/utils/time";
  import { cn } from "@/utils/utils";
  import { loadVideoDialog } from "@/utils/video";
  import MediaControls from "./video-playback/MediaControls.svelte";
  interface Props {
    src: string;
    onError: (error: string) => void;
    onLoading: (loading: boolean) => void;
    videoElement?: HTMLVideoElement | null;
  }

  let { src, onError, onLoading, videoElement = $bindable() }: Props = $props();
  let isFullscreen = $state(false);
  let controlsTimeout: number | null = null;

  // Handle video events
  function handleLoadStart(): void {
    console.log("Video load started");
    onLoading(true);
  }

  function handleLoadedData(): void {
    console.log("Video data loaded");
    onLoading(false);
    if (videoElement) {
      playerState.duration = videoElement.duration;
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

  function toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      videoElement?.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  function handleFullscreenChange(): void {
    isFullscreen = !!document.fullscreenElement;
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

  function handleKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case "Space":
        event.preventDefault();
        togglePlay();
        break;
      case "KeyF":
        event.preventDefault();
        toggleFullscreen();
        break;
      case "KeyM":
        event.preventDefault();
        toggleMute();
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (videoElement) {
          videoElement.currentTime = Math.max(0, videoElement.currentTime - 10);
        }
        break;
      case "ArrowRight":
        event.preventDefault();
        if (videoElement) {
          videoElement.currentTime = Math.min(playerState.duration, videoElement.currentTime + 10);
        }
        break;
    }
  }

  function handleDblClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;

    // Check if the click is within the media controls
    const controlsElement = target.closest("#media-controls");
    if (controlsElement) {
      return; // Don't trigger if clicking on controls
    }

    // Trigger on video element OR the main container (for when no video is loaded)
    if (target.tagName === "VIDEO" || target.id === "video-player") {
      console.log("Load video dialog");
      loadVideoDialog();
    }
  }

  // Add event listeners for fullscreen changes
  $effect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  });

  // Show controls when not playing
  $effect(() => {
    if (!playerState.isPlaying) {
      playerState.showControls = true;
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
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
    onkeydown={handleKeyDown}
    ondblclick={handleDblClick}
    id="video-player"
  >
    {#if playerState.currentVideo}
      <video
        bind:this={videoElement}
        {src}
        class="video-no-controls max-h-full max-w-full object-contain"
        onloadstart={handleLoadStart}
        onloadeddata={handleLoadedData}
        onloadedmetadata={handleLoadedMetadata}
        ontimeupdate={handleTimeUpdate}
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
    {/if}
  </div>

  <!-- Media controls -->
  <MediaControls {videoElement} />
</div>

<style>
  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 2px solid #ffffff;
  }

  .slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 2px solid #ffffff;
  }
</style>
