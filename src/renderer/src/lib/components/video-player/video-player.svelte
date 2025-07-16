<script lang="ts">
  import VideoPlayerControls from "./video-player-controls.svelte";
  import VideoPlayerTitle from "./video-player-title.svelte";
  import { playerState } from "$/state.svelte";
  import { loadFileSystemStructure } from "$lib/file-browser.svelte";
  import { cn } from "$lib/utils";
  import { playNextVideo } from "$lib/video-playback";

  let controlsTimeout: number | null = null;
  let overlayTimeout: number | null = null;
  let showOverlay = $state(false);

  function onLoading(loading: boolean): void {
    playerState.isLoading = loading;
  }

  function onError(message: string): void {
    playerState.error = message;
    playerState.isLoading = false;
  }

  function handleLoadStart(): void {
    // console.log("Video load started");
    onLoading(true);
  }

  function handleLoadedData(): void {
    // console.log("Video data loaded");
    onLoading(false);
    if (playerState.videoElement) {
      playerState.duration = playerState.videoElement.duration;
      playerState.videoElement.play().catch((error) => {
        console.error("Auto-play failed:", error);
      });
    }
  }

  function handleLoadedMetadata(): void {
    // console.log("Video metadata loaded");
    if (playerState.videoElement) {
      playerState.duration = playerState.videoElement.duration;
    }
  }

  function handleTimeUpdate(): void {
    if (playerState.videoElement) {
      playerState.currentTime = playerState.videoElement.currentTime;
    }
  }

  function handleSeeked(): void {
    if (playerState.videoElement) {
      playerState.currentTime = playerState.videoElement.currentTime;
    }
  }

  function handleError(event: Event): void {
    console.error("Video error:", event);

    if ("path" in event && event.path) {
      console.error("Event path:", event.path);
      if (Array.isArray(event.path) && event.path?.[0]) {
        console.error("Event path first element:", event.path[0]);
      }
    }

    const target = event.target as HTMLVideoElement;

    console.group("Video Error Details");
    console.log("Video src:", target.src);
    console.log("Video currentSrc:", target.currentSrc);
    console.log("Video readyState:", target.readyState);
    console.log("Video networkState:", target.networkState);
    console.log("Video error object:", target.error);
    console.groupEnd();

    if (target.error) {
      console.log("Error code:", target.error.code);
      console.log("Error message:", target.error.message);
    }

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
    if (!playerState.videoElement || !playerState.currentVideo) return;

    playerState.isPlaying = true;
  }

  function handlePause(): void {
    playerState.isPlaying = false;
  }

  function handleEnded(): void {
    const currentVideo = playerState.currentVideo;
    if (!currentVideo) return;

    if (playerState.repeatMode === "one") {
      // Repeat the current video
      console.log("Repeating current video");
      if (playerState.videoElement) {
        playerState.videoElement.currentTime = 0;
        playerState.currentTime = 0;
        void playerState.videoElement.play();
      }

      return;
    }

    // Always attempt to play next video for repeatMode 'all' and 'off'.
    playNextVideo();
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
    }, 3_000) as unknown as number;
  }

  function showOverlayTemporarily(): void {
    showOverlay = true;
    if (overlayTimeout) {
      clearTimeout(overlayTimeout);
    }

    overlayTimeout = setTimeout(() => {
      showOverlay = false;
    }, 2_000) as unknown as number;
  }

  function handleMouseMove(): void {
    showControlsTemporarily();
    showOverlayTemporarily();
  }

  function handleClick(): void {
    const videoContainer = document.querySelector("#video-player");
    if (videoContainer) {
      videoContainer.focus();
    }
  }

  async function handleDblClick(ev: MouseEvent): Promise<void> {
    console.log("Double click detected on video player");

    const target = ev.target as HTMLElement;
    const controlsElement = target.closest("#media-controls");
    if (controlsElement) {
      return;
    }

    if (target.tagName === "VIDEO" || target.id === "video-player") {
      if (!playerState.currentVideo) {
        await loadFileSystemStructure();
      } else if (playerState.videoElement.paused) {
        await playerState.videoElement.play();
      } else {
        playerState.videoElement.pause();
      }
    }
  }

  $effect(() => {
    if (!playerState.isPlaying) {
      playerState.showControls = true;
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    }
  });

  $effect(() => {
    if (playerState.videoElement) {
      playerState.videoElement.volume = playerState.isMuted ? 0 : playerState.volume;
      playerState.videoElement.muted = playerState.isMuted;
      playerState.videoElement = playerState.videoElement;
    }
  });
</script>

<div class="flex h-full w-full flex-col bg-zinc-950">
  <!-- Video container -->
  <div
    class={cn(
      "group relative flex h-[90%] w-full flex-1 items-center justify-center",
      !playerState.currentVideo &&
        "cursor-pointer transition-all duration-300 ease-out hover:bg-slate-100/15 hover:shadow-inner hover:backdrop-blur-md"
    )}
    onmousemove={handleMouseMove}
    onclick={handleClick}
    ondblclick={handleDblClick}
    id="video-player"
  >
    {#if playerState.currentVideo}
      <video
        bind:this={playerState.videoElement}
        src={playerState.currentVideo}
        class="video-no-controls h-full w-full cursor-pointer object-contain"
        onloadstart={handleLoadStart}
        onloadeddata={handleLoadedData}
        onloadedmetadata={handleLoadedMetadata}
        ontimeupdate={handleTimeUpdate}
        onseeked={handleSeeked}
        onerror={handleError}
        oncanplay={handleCanPlay}
        onplay={handlePlay}
        onpause={handlePause}
        onended={handleEnded}
        preload="metadata"
        crossorigin="anonymous"
        controls={false}
        controlslist="nodownload nofullscreen noremoteplayback"
        disablepictureinpicture
      >
      </video>

      <VideoPlayerTitle {showOverlay} />
      <VideoPlayerControls {showOverlay} />
    {/if}
  </div>
</div>
