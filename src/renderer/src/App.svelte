<script lang="ts">
  import VideoPlayer from "./components/VideoPlayer.svelte";
  import { playerState } from "./state.svelte";

  interface PlaylistItem {
    id: string;
    name: string;
    path: string;
    duration?: number;
    size?: number;
  }

  interface MediaInfo {
    filename?: string;
    duration?: number;
    resolution?: { width: number; height: number };
    frameRate?: number;
    bitrate?: number;
    codec?: string;
    audioCodec?: string;
    audioChannels?: number;
    audioSampleRate?: number;
    fileSize?: number;
    aspectRatio?: string;
  }

  let videoElement = $state<HTMLVideoElement | null>(null);

  window.electron.ipcRenderer.on("video-file-loaded", async (_ev, filePaths: string[]) => {
    console.log("Received filePaths:", filePaths);
    playerState.error = null;
    playerState.isLoading = true;

    if (filePaths.length === 1) {
      const filePath = filePaths[0];
      console.log("Loading video file:", filePath);

      playerState.videoSrc = `file://${filePath}`;
      console.log("Video source set to:", playerState.videoSrc);
    } else if (filePaths.length === 0) {
      playerState.error = "No valid video files selected";
      playerState.isLoading = false;
    }
  });

  function handleVideoError(errorMessage: string): void {
    playerState.error = errorMessage;
    playerState.isLoading = false;
  }

  function handleVideoLoading(loading: boolean): void {
    playerState.isLoading = loading;
  }
</script>

<div class="bg-player-bg text-player-text dark flex h-screen flex-col">
  <div class="flex w-full flex-1 overflow-hidden">
    <main class="relative flex-1 bg-black">
      {#if playerState.error}
        <div
          class="bg-player-error absolute left-1/2 top-4 z-50 flex -translate-x-1/2 transform items-center space-x-2 rounded-lg px-4 py-2 text-white shadow-lg"
        >
          <span>⚠️ {playerState.error}</span>
          <button
            onclick={() => (playerState.error = null)}
            class="ml-2 rounded px-2 py-1 hover:bg-red-600">✕</button
          >
        </div>
      {/if}

      <VideoPlayer
        src={playerState.videoSrc}
        onError={handleVideoError}
        onLoading={handleVideoLoading}
        bind:videoElement
      />
    </main>
  </div>
</div>
