<script lang="ts">
  import { playerState } from "@/state.svelte";
  import { makeTimeString } from "@/utils/time";

  interface Props {
    videoElement?: HTMLVideoElement;
  }

  let { videoElement }: Props = $props();

  const handleSeek = (ev: MouseEvent) => {
    if (!videoElement) return;

    const progressBar = ev.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const percent = (ev.clientX - rect.left) / rect.width;
    const newTime = percent * playerState.duration;

    videoElement.currentTime = newTime;
    playerState.currentTime = newTime;
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
    <div
      class="h-1 flex-1 cursor-pointer rounded-full bg-gray-600 transition-all hover:h-2"
      onclick={handleSeek}
      role="slider"
    >
      <div
        class="h-full rounded-full bg-blue-500 transition-all"
        style="width: {playerState.duration > 0
          ? (playerState.currentTime / playerState.duration) * 100
          : 0}%"
      ></div>
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
  </div>
</div>
