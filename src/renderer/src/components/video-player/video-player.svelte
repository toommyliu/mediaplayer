<script lang="ts">
  import { loadFileSystemStructure } from "$lib/file-browser.svelte";
  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
  import { cn } from "$lib/utils";
  import { playNextVideo } from "$lib/video-playback";
  import VideoPlayerControls from "./video-player-controls.svelte";

  // Floating controls state
  let showControls = $state(true);
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let isControlsHovered = $state(false);

  // Auto-hide controls after inactivity
  function resetHideTimer(): void {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    showControls = true;

    // Don't hide controls if they're being hovered or if video is paused
    if (!isControlsHovered && playerState.isPlaying) {
      hideTimeout = setTimeout(() => {
        if (!isControlsHovered) {
          showControls = false;
        }
      }, 3000); // Hide after 3 seconds of inactivity
    }
  }

  function handleMouseMove(): void {
    resetHideTimer();
  }

  function handleMouseLeave(): void {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    if (playerState.isPlaying && !isControlsHovered) {
      showControls = false;
    }
  }

  function handleControlsMouseEnter(): void {
    isControlsHovered = true;
    showControls = true;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
  }

  function handleControlsMouseLeave(): void {
    isControlsHovered = false;
    resetHideTimer();
  }

  // Show controls when video is paused
  $effect(() => {
    if (!playerState.isPlaying) {
      showControls = true;
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    } else {
      resetHideTimer();
    }
  });

  // Cleanup timeout on component unmount
  $effect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  });

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

  function handleClick(): void {
    const videoContainer = document.querySelector("#video-player") as HTMLElement | null;
    if (videoContainer) {
      videoContainer.focus();
    }
  }

  async function handleDblClick(ev: MouseEvent): Promise<void> {
    console.log("Double click detected on video player");

    const target = ev.target as HTMLElement;
    const controlsElement = target.closest("#media-controls");
    if (controlsElement) {
      console.warn("no controls element");
      return;
    }

    if (target.tagName === "VIDEO" || target.closest("#video-player")) {
      if (!queue.currentItem) {
        await loadFileSystemStructure();
      } else {
        await playerState.togglePlayPause();
      }
    }
  }
</script>

<div
  class={cn(
    "group relative flex h-full w-full flex-1 flex-col",
    !queue.currentItem &&
      "transition-all duration-300 ease-out hover:bg-slate-100/15 hover:shadow-inner hover:backdrop-blur-md"
  )}
  id="video-player"
>
  {#if queue.currentItem}
    <div
      class={cn(
        "relative flex min-h-0 flex-1 items-center justify-center bg-black transition-all duration-300",
        !showControls && "cursor-none"
      )}
      onclick={handleClick}
      ondblclick={handleDblClick}
      onmousemove={handleMouseMove}
      onmouseleave={handleMouseLeave}
    >
      <video
        bind:this={playerState.videoElement}
        src={`file://${queue.currentItem.path}`}
        class="h-full w-full object-contain"
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
        controls={false}
        controlslist="nodownload nofullscreen noremoteplaybook"
        disablepictureinpicture
      >
      </video>

      <!-- Floating controls overlay -->
      <div
        class={cn(
          "absolute right-0 bottom-0 left-0 z-10 transition-all duration-300 ease-in-out",
          showControls ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        )}
        onmouseenter={handleControlsMouseEnter}
        onmouseleave={handleControlsMouseLeave}
      >
        <VideoPlayerControls />
      </div>
    </div>
  {:else}
    <div
      class="flex flex-1 items-center justify-center"
      onclick={handleClick}
      ondblclick={handleDblClick}
    ></div>

    <div class="pointer-events-none flex-shrink-0 opacity-0">
      <VideoPlayerControls />
    </div>
  {/if}
</div>
