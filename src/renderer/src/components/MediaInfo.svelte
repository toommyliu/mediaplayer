<script lang="ts">
  import {
    BarChart3,
    ChevronDown,
    ChevronRight,
    Folder,
    Film,
    Volume2,
    Zap,
    FileText
  } from "lucide-svelte";

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

  interface MediaInfoProps {
    info: MediaInfo | null;
    videoElement?: HTMLVideoElement | null;
  }

  let { info = null, videoElement = null }: MediaInfoProps = $props();

  let expanded = $state(false);
  let realTimeInfo = $state<{
    currentTime: number;
    playbackRate: number;
    volume: number;
    buffered: number;
    networkState: number;
    readyState: number;
  } | null>(null);

  function updateRealTimeInfo(): void {
    if (!videoElement) {
      realTimeInfo = null;
      return;
    }

    const bufferedPercentage =
      videoElement.buffered.length > 0
        ? (videoElement.buffered.end(videoElement.buffered.length - 1) / videoElement.duration) *
          100
        : 0;

    realTimeInfo = {
      currentTime: videoElement.currentTime,
      playbackRate: videoElement.playbackRate,
      volume: videoElement.volume,
      buffered: bufferedPercentage,
      networkState: videoElement.networkState,
      readyState: videoElement.readyState
    };
  }

  $effect(() => {
    if (!videoElement) return;

    const interval = setInterval(updateRealTimeInfo, 500);
    updateRealTimeInfo(); // Initial update

    return () => clearInterval(interval);
  });

  function formatDuration(seconds?: number): string {
    if (!seconds) return "--:--";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return "--";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  function formatBitrate(bitrate?: number): string {
    if (!bitrate) return "--";
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(1)} Mbps`;
    } else if (bitrate >= 1000) {
      return `${(bitrate / 1000).toFixed(0)} Kbps`;
    }
    return `${bitrate} bps`;
  }

  function getNetworkStateText(state: number): string {
    switch (state) {
      case 0:
        return "Empty";
      case 1:
        return "Idle";
      case 2:
        return "Loading";
      case 3:
        return "No Source";
      default:
        return "Unknown";
    }
  }

  function getReadyStateText(state: number): string {
    switch (state) {
      case 0:
        return "No Data";
      case 1:
        return "Metadata";
      case 2:
        return "Current Data";
      case 3:
        return "Future Data";
      case 4:
        return "Enough Data";
      default:
        return "Unknown";
    }
  }
</script>

<div class="bg-player-surface border-player-border rounded-lg border">
  <button
    class="hover:bg-player-accent/10 flex w-full items-center justify-between rounded-lg p-3 text-white transition-colors"
    onclick={() => (expanded = !expanded)}
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        expanded = !expanded;
      }
    }}
  >
    <h3 class="flex items-center gap-2 text-sm font-medium text-gray-300">
      <BarChart3 size={16} />
      Media Information
    </h3>
    <span class="text-xs text-gray-400">
      {#if expanded}
        <ChevronDown size={12} />
      {:else}
        <ChevronRight size={12} />
      {/if}
    </span>
  </button>

  {#if expanded}
    <div class="space-y-4 p-3 pt-0 text-white">
      {#if info}
        <div class="space-y-3">
          <h4
            class="text-player-accent border-player-border flex items-center gap-1 border-b pb-1 text-xs font-medium"
          >
            <Folder size={12} />
            File Information
          </h4>
          <div class="grid grid-cols-1 gap-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Filename:</span>
              <span class="font-mono text-white">{info.filename || "Unknown"}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Duration:</span>
              <span class="font-mono text-white">{formatDuration(info.duration)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">File Size:</span>
              <span class="font-mono text-white">{formatFileSize(info.fileSize)}</span>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <h4
            class="text-player-accent border-player-border flex items-center gap-1 border-b pb-1 text-xs font-medium"
          >
            <Film size={12} />
            Video Information
          </h4>
          <div class="grid grid-cols-1 gap-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Resolution:</span>
              <span class="font-mono text-white">
                {info.resolution ? `${info.resolution.width}×${info.resolution.height}` : "--"}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Aspect Ratio:</span>
              <span class="font-mono text-white">{info.aspectRatio || "--"}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Frame Rate:</span>
              <span class="font-mono text-white"
                >{info.frameRate ? `${info.frameRate} fps` : "--"}</span
              >
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Video Codec:</span>
              <span class="font-mono text-white">{info.codec || "--"}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Bitrate:</span>
              <span class="font-mono text-white">{formatBitrate(info.bitrate)}</span>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <h4
            class="text-player-accent border-player-border flex items-center gap-1 border-b pb-1 text-xs font-medium"
          >
            <Volume2 size={12} />
            Audio Information
          </h4>
          <div class="grid grid-cols-1 gap-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Audio Codec:</span>
              <span class="font-mono text-white">{info.audioCodec || "--"}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Channels:</span>
              <span class="font-mono text-white">{info.audioChannels || "--"}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Sample Rate:</span>
              <span class="font-mono text-white">
                {info.audioSampleRate ? `${info.audioSampleRate} Hz` : "--"}
              </span>
            </div>
          </div>
        </div>
      {/if}

      {#if realTimeInfo}
        <div class="space-y-3">
          <h4
            class="text-player-accent border-player-border flex items-center gap-1 border-b pb-1 text-xs font-medium"
          >
            <Zap size={12} />
            Real-time Status
          </h4>
          <div class="grid grid-cols-1 gap-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Current Time:</span>
              <span class="font-mono text-white">{formatDuration(realTimeInfo.currentTime)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Playback Rate:</span>
              <span class="font-mono text-white">{realTimeInfo.playbackRate}×</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Volume:</span>
              <span class="font-mono text-white">{Math.round(realTimeInfo.volume * 100)}%</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Buffered:</span>
              <span class="font-mono text-white">{realTimeInfo.buffered.toFixed(1)}%</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Network State:</span>
              <span class="font-mono text-white"
                >{getNetworkStateText(realTimeInfo.networkState)}</span
              >
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Ready State:</span>
              <span class="font-mono text-white">{getReadyStateText(realTimeInfo.readyState)}</span>
            </div>
          </div>
        </div>
      {/if}

      {#if !info && !realTimeInfo}
        <div class="py-8 text-center">
          <div class="mb-2 flex justify-center text-4xl">
            <FileText size={48} />
          </div>
          <p class="text-sm text-gray-400">No media information available</p>
          <p class="text-xs text-gray-500">Load a video file to see details</p>
        </div>
      {/if}
    </div>
  {/if}
</div>
