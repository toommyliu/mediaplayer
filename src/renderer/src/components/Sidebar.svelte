<script lang="ts">
  import Playlist from "./Playlist.svelte";
  import MediaInfo from "./MediaInfo.svelte";
  import FileBrowser from "./FileBrowser.svelte";

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

  interface Props {
    sidebarCollapsed: boolean;
    sidebarWidth: number;
    isMobile: boolean;
    isResizing: boolean;
    activeTab: "playlist" | "info" | "browser";
    playlist: PlaylistItem[];
    currentPlaylistItem: string | null;
    mediaInfo: MediaInfo | null;
    videoSrc: string | null;
    isLoading: boolean;
    autoPlayNext: boolean;
    repeatMode: "none" | "one" | "all";
    onToggleSidebar: () => void;
    onResizeStart: (event: MouseEvent) => void;
    onSwitchTab: (tab: "playlist" | "info" | "browser") => void;
    onPlayPlaylistItem: (item: PlaylistItem) => void;
    onRemoveFromPlaylist: (id: string) => void;
    onClearPlaylist: () => void;
    onShufflePlaylist: () => void;
    onFileSelect: (filePath: string) => void;
    onFolderSelect: (folderPath: string) => void;
    getVideoElement: () => HTMLVideoElement | null;
    onLoadVideoFile: () => void;
    onClearVideo: () => void;
    onSaveSettings: () => void;
  }

  let {
    sidebarCollapsed,
    sidebarWidth,
    isMobile,
    isResizing,
    activeTab,
    playlist,
    currentPlaylistItem,
    mediaInfo,
    videoSrc,
    isLoading,
    autoPlayNext = $bindable(),
    repeatMode = $bindable(),
    onToggleSidebar,
    onResizeStart,
    onSwitchTab,
    onPlayPlaylistItem,
    onRemoveFromPlaylist,
    onClearPlaylist,
    onShufflePlaylist,
    onFileSelect,
    onFolderSelect,
    getVideoElement,
    onLoadVideoFile,
    onClearVideo,
    onSaveSettings
  }: Props = $props();
</script>

<div class="flex {sidebarCollapsed ? 'hidden' : ''}">
  {#if !isMobile}
    <div
      class="group w-1 cursor-col-resize bg-gray-700/50 transition-all duration-200 hover:bg-blue-500"
      onmousedown={onResizeStart}
      title="Drag to resize sidebar"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
    >
      <div
        class="h-full w-full bg-blue-500/20 opacity-0 transition-opacity group-hover:opacity-100"
      ></div>
    </div>
  {/if}

  <aside
    class="flex flex-col border-l border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-950 shadow-2xl {isMobile
      ? 'fixed right-0 top-0 z-40 h-full transform transition-transform duration-300 ease-in-out'
      : ''}"
    style="width: {isMobile ? '90vw' : sidebarWidth + 'px'}; max-width: {isMobile
      ? '90vw'
      : 'none'}"
  >
    {#if isMobile}
      <div
        class="flex items-center justify-between border-b border-gray-700/50 bg-gray-800/50 p-4 backdrop-blur-sm"
      >
        <h2 class="text-lg font-semibold text-white">Media Player</h2>
        <button
          onclick={onToggleSidebar}
          class="rounded-lg p-2 text-gray-400 transition-all duration-200 hover:bg-gray-700/50 hover:text-white"
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    {:else}
      <div class="flex justify-end border-b border-gray-700/50 bg-gray-800/30 p-3">
        <button
          onclick={onToggleSidebar}
          class="rounded-lg p-2 text-gray-400 transition-all duration-200 hover:bg-gray-700/50 hover:text-white"
          title="Hide sidebar"
          aria-label="Hide sidebar"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>
    {/if}

    <div class="border-b border-gray-700/50 bg-gray-800/30">
      <nav class="flex overflow-x-auto">
        <button
          class="whitespace-nowrap px-6 py-3 text-sm font-medium transition-all duration-200 {activeTab ===
          'playlist'
            ? 'border-b-2 border-blue-500 bg-blue-600/20 text-blue-400 shadow-inner'
            : 'text-gray-400 hover:bg-gray-700/30 hover:text-white'}"
          onclick={() => onSwitchTab("playlist")}
        >
          <div class="flex items-center space-x-2">
            <span>🎵</span>
            <span>Playlist</span>
          </div>
        </button>
        <button
          class="whitespace-nowrap px-6 py-3 text-sm font-medium transition-all duration-200 {activeTab ===
          'info'
            ? 'border-b-2 border-green-500 bg-green-600/20 text-green-400 shadow-inner'
            : 'text-gray-400 hover:bg-gray-700/30 hover:text-white'}"
          onclick={() => onSwitchTab("info")}
        >
          <div class="flex items-center space-x-2">
            <span>ℹ️</span>
            <span>Info</span>
          </div>
        </button>
        <button
          class="whitespace-nowrap px-6 py-3 text-sm font-medium transition-all duration-200 {activeTab ===
          'browser'
            ? 'border-b-2 border-purple-500 bg-purple-600/20 text-purple-400 shadow-inner'
            : 'text-gray-400 hover:bg-gray-700/30 hover:text-white'}"
          onclick={() => onSwitchTab("browser")}
        >
          <div class="flex items-center space-x-2">
            <span>📁</span>
            <span>Browser</span>
          </div>
        </button>
      </nav>
    </div>

    <div class="flex-1 overflow-hidden bg-gray-900/50">
      {#if activeTab === "playlist"}
        <Playlist
          items={playlist}
          currentItem={currentPlaylistItem}
          onPlay={onPlayPlaylistItem}
          onRemove={onRemoveFromPlaylist}
          onClear={onClearPlaylist}
          onShuffle={onShufflePlaylist}
        />
      {:else if activeTab === "info"}
        <MediaInfo info={mediaInfo} videoElement={getVideoElement()} />
      {:else if activeTab === "browser"}
        <FileBrowser {onFileSelect} {onFolderSelect} />
      {/if}
    </div>

    <div class="space-y-4 border-t border-gray-700/50 bg-gray-800/50 p-4 backdrop-blur-sm">
      <div class="flex space-x-2">
        <button
          onclick={onLoadVideoFile}
          disabled={isLoading}
          class="min-w-0 flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-500 hover:to-blue-600 hover:shadow-blue-500/25 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50"
        >
          <span class="hidden sm:inline">📁 Open Video</span>
          <span class="sm:hidden">📁</span>
        </button>
        {#if videoSrc}
          <button
            onclick={onClearVideo}
            class="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-red-500 hover:to-red-600 hover:shadow-red-500/25"
            title="Clear current video"
          >
            🗑️
          </button>
        {/if}
      </div>

      <div class="space-y-3">
        <label class="group flex cursor-pointer items-center space-x-3 text-sm">
          <input
            type="checkbox"
            bind:checked={autoPlayNext}
            onchange={onSaveSettings}
            class="rounded border-gray-600 bg-gray-700 text-blue-500 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          <span class="text-gray-300 transition-colors duration-200 group-hover:text-white"
            >Auto-play next</span
          >
        </label>

        <div class="flex items-center space-x-3 text-sm">
          <span class="flex-shrink-0 text-gray-300">Repeat:</span>
          <select
            bind:value={repeatMode}
            onchange={onSaveSettings}
            class="min-w-0 flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="one">One</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
    </div>
  </aside>
</div>
