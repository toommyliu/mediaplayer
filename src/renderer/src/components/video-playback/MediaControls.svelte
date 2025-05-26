<script lang="ts">
  import { playerState } from "@/state.svelte";
  import { makeTimeString } from "@/utils/time";

  const handleSeek = (ev: MouseEvent) => {
    if (!videoElement) return;

    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const percent = (ev.clientX - rect.left) / rect.width;
    const newTime = percent * playerState.duration;

    videoElement.currentTime = newTime;
    playerState.currentTime = newTime;
  };
  const togglePlay = () => {
    if (!videoElement || !playerState.videoSrc) return;

    if (playerState.isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play().catch((error) => {
        console.error("Error playing video:", error);
      });
    }
  };
  const toggleMute = () => {
    if (!videoElement || !playerState.videoSrc) return;

    playerState.isMuted = !playerState.isMuted;
    videoElement.muted = playerState.isMuted;

    videoElement.volume = playerState.isMuted ? 0 : playerState.volume;
  };
  const changeVolume = (ev: Event) => {
    if (!videoElement || !playerState.videoSrc) return;

    const target = ev.target as HTMLInputElement;
    const newVolume = Number.parseFloat(target.value);

    playerState.volume = newVolume;
    playerState.isMuted = newVolume === 0;

    videoElement.volume = newVolume;
    videoElement.muted = playerState.isMuted;
  };

  let { videoElement }: { videoElement: HTMLVideoElement } = $props();
</script>

<div
  class="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300 border-t"
  style="height: 10%"
  class:opacity-0={!playerState.showControls && playerState.isPlaying}
  class:opacity-100={playerState.showControls || !playerState.isPlaying}
  id="media-controls"
>
  <div class="flex items-center space-x-4 mb-4">
    <!-- Playback progress bar -->
    <div
      class="flex-1 bg-gray-600 h-1 rounded-full cursor-pointer hover:h-2 transition-all"
      onclick={handleSeek}
      role="slider"
    >
      <div
        class="bg-blue-500 h-full rounded-full transition-all"
        style="width: {playerState.duration > 0
          ? (playerState.currentTime / playerState.duration) * 100
          : 0}%"
      ></div>
    </div>

    <!-- Volume bar -->
    <div class="flex items-center space-x-2">
      <button
        onclick={toggleMute}
        class="text-white hover:text-blue-400 text-lg focus:outline-none focus:text-blue-400 transition-colors"
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
        class="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  </div>

  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <button
        onclick={togglePlay}
        class="text-white hover:text-blue-400 text-2xl focus:outline-none focus:text-blue-400 transition-colors"
      >
        {playerState.isPlaying ? "⏸️" : "▶️"}
      </button>

      <div class="text-white text-sm font-mono">
        <span>{makeTimeString(playerState.currentTime)}</span>
        <span class="mx-1">/</span>
        <span>{makeTimeString(playerState.duration)}</span>
      </div>
    </div>
  </div>
</div>
