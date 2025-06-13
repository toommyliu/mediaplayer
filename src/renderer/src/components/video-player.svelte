<script lang="ts">
  import { playerState, playlistState } from "@/state.svelte";
  import { cn } from "@/utils/utils";
  import { makeTimeString } from "@/utils/time";
  import MediaControls from "./media-controls.svelte";
  import { loadFileSystemStructure } from "@/utils/file-browser.svelte";
  import { nextPlaylistVideo, nextVideo } from "@/utils/video-playback";

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
    console.log("Video load started");
    onLoading(true);
  }

  function handleLoadedData(): void {
    console.log("Video data loaded");
    onLoading(false);
    if (playerState.videoElement) {
      playerState.duration = playerState.videoElement.duration;
      playerState.videoElement.play().catch((error) => {
        console.error("Auto-play failed:", error);
      });
    }
  }

  function handleLoadedMetadata(): void {
    console.log("Video metadata loaded");
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
    console.log("Video ended, checking for next video");

    const currentVideo = playerState.currentVideo;
    if (!currentVideo) return;

    const currentPlaylist = playlistState.currentPlaylist;
    if (currentPlaylist && currentPlaylist.items.length > 0) {
      nextPlaylistVideo();
    } else {
      nextVideo();
    }
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

  function showOverlayTemporarily(): void {
    showOverlay = true;
    if (overlayTimeout) {
      clearTimeout(overlayTimeout);
    }
    overlayTimeout = setTimeout(() => {
      showOverlay = false;
    }, 2000) as unknown as number;
  }

  function handleMouseMove(): void {
    showControlsTemporarily();
    showOverlayTemporarily();
  }

  function handleClick(): void {
    const videoContainer = document.getElementById("video-player");
    if (videoContainer) {
      videoContainer.focus();
    }
  }

  async function handleDblClick(ev: MouseEvent): Promise<void> {
    const target = ev.target as HTMLElement;
    const controlsElement = target.closest("#media-controls");
    if (controlsElement) {
      return;
    }

    if (target.tagName === "VIDEO" || target.id === "video-player") {
      if (!playerState.currentVideo) {
        await loadFileSystemStructure();
      } else {
        console.log("Double click ignored - video already loaded");
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
        class="video-no-controls h-full w-full object-contain"
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

      <!-- Hover overlay -->
      <div
        class="absolute left-4 top-4 rounded-lg bg-black bg-opacity-70 p-3 text-white transition-opacity duration-300"
        class:opacity-100={showOverlay}
        class:opacity-0={!showOverlay}
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

  <MediaControls />
</div>
