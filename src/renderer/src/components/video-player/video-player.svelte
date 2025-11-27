<script lang="ts">
  import { fileBrowserState } from "$lib/state/file-browser.svelte";
  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
  import { cn } from "$lib/utils";
  import VideoPlayerControls from "./video-player-controls.svelte";
  import UpNextNotification from "./notifications/UpNextNotification.svelte";
  import VideoInfoDisplay from "./notifications/VideoInfoDisplay.svelte";

  type AspectRatioMode = "contain" | "cover" | "fill";
  let aspectRatio: AspectRatioMode = $state("contain");
  let videoAspectRatio = $state<number | null>(null);

  let restoring = playerState.currentVideo !== null;
  let resumeTime = playerState.currentTime;
  let resumePlaying = playerState.isPlaying;

  const aspectRatioClass = $derived(() => {
    switch (aspectRatio) {
      case "contain":
        return "object-contain";
      case "cover":
        return "object-cover";
      case "fill":
        return "object-fill";
      default:
        return "";
    }
  });

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
    onLoading(true);
  }

  function handleLoadedData(): void {
    onLoading(false);
    if (playerState.videoElement) {
      playerState.duration = playerState.videoElement.duration;

      if (restoring) {
        console.log("Restoring playback state:", { resumeTime, resumePlaying });
        if (resumeTime > 0) {
          playerState.videoElement.currentTime = resumeTime;
        }

        if (resumePlaying) {
          playerState.videoElement.play().catch((error) => {
            console.error("Auto-play failed:", error);
          });
        } else {
          playerState.videoElement.pause();
          playerState.isPlaying = false;
        }

        restoring = false;
      } else {
        playerState.videoElement.play().catch((error) => {
          console.error("Auto-play failed:", error);
        });
      }
    }
  }

  function handleLoadedMetadata(): void {
    if (playerState.videoElement) {
      playerState.duration = playerState.videoElement.duration;
      const { videoWidth, videoHeight } = playerState.videoElement;
      if (videoWidth && videoHeight) {
        videoAspectRatio = videoWidth / videoHeight;
      }
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

    if (queue.repeatMode === "one") {
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
    videoAspectRatio = null;
    playerState.playNextVideo();
  }

  function handleClick(): void {
    const videoContainer = document.querySelector("#video-player") as HTMLElement | null;
    if (videoContainer) {
      videoContainer.focus();
    }
  }

  async function handleDblClick(ev: MouseEvent): Promise<void> {
    const target = ev.target as HTMLElement | null;

    // If there's already a video element mounted, don't treat dblclicks that
    // originate inside the controls as a toggle action.
    if (playerState.videoElement && target && typeof target.closest === "function") {
      const controlsElement = target.closest("#media-controls");
      if (controlsElement) return;
    }

    // If the double-click happened on the video element or its container, toggle play/pause
    // or loading the file system structure.
    if (target && (target.tagName === "VIDEO" || target.closest("#video-player"))) {
      if (!queue.currentItem) await fileBrowserState.loadFileSystemStructure();
      else await playerState.togglePlayPause();
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
      <div
        class="shrink-0"
        style:max-width={aspectRatio === "contain" ? "100%" : undefined}
        style:max-height={aspectRatio === "contain" ? "100%" : undefined}
        style:aspect-ratio={aspectRatio === "contain"
          ? videoAspectRatio
            ? `${videoAspectRatio}`
            : "16 / 9"
          : undefined}
      >
        <video
          bind:this={playerState.videoElement}
          src={`file://${queue.currentItem.path}`}
          class={cn("h-full w-full bg-black", aspectRatioClass)}
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
      </div>

      <VideoInfoDisplay visible={showControls} />
      <UpNextNotification />

      <!-- Floating controls overlay -->
      <div
        class={cn(
          "absolute right-0 bottom-0 left-0 z-10 transition-all duration-300 ease-in-out",
          showControls ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        )}
        onmouseenter={handleControlsMouseEnter}
        onmouseleave={handleControlsMouseLeave}
      >
        <VideoPlayerControls {aspectRatio} onAspectRatioChange={(mode) => (aspectRatio = mode)} />
      </div>
    </div>
  {:else}
    <div
      class="flex flex-1 items-center justify-center"
      onclick={handleClick}
      ondblclick={handleDblClick}
    ></div>

    <div class="pointer-events-none flex-shrink-0 opacity-0">
      <VideoPlayerControls aspectRatio="contain" onAspectRatioChange={() => {}} />
    </div>
  {/if}
</div>
