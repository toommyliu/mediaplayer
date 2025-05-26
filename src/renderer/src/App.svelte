<script lang="ts">
  import VideoPlayer from "./components/VideoPlayer.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import { playerState } from "./state.svelte";
  import { loadVideoDialog } from "@/utils/video";

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
  let recentFiles = $state<string[]>([]);
  let playlist = $state<PlaylistItem[]>([]);
  let currentPlaylistItem = $state<string | null>(null);
  let mediaInfo = $state<MediaInfo | null>(null);
  let autoPlayNext = $state(true);
  let repeatMode = $state<"none" | "one" | "all">("none");
  let darkMode = $state(true);
  let sidebarWidth = $state(320);
  let isResizing = $state(false);
  let sidebarCollapsed = $state(false);
  let isMobile = $state(false);
  let activeTab = $state<"playlist" | "info" | "browser">("playlist");

  function loadSettings(): void {
    try {
      const stored = localStorage.getItem("recentVideoFiles");
      recentFiles = stored ? JSON.parse(stored) : [];

      const storedPlaylist = localStorage.getItem("videoPlaylist");
      playlist = storedPlaylist ? JSON.parse(storedPlaylist) : [];

      const storedSettings = localStorage.getItem("playerSettings");
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        autoPlayNext = settings.autoPlayNext ?? true;
        repeatMode = settings.repeatMode ?? "none";
        darkMode = settings.darkMode ?? true;
        sidebarWidth = settings.sidebarWidth ?? 320;
        sidebarCollapsed = settings.sidebarCollapsed ?? false;
        activeTab = settings.activeTab ?? "playlist";
      }
    } catch {
      console.warn("Failed to load settings");
    }
  }

  function saveSettings(): void {
    try {
      localStorage.setItem("recentVideoFiles", JSON.stringify(recentFiles));
      localStorage.setItem("videoPlaylist", JSON.stringify(playlist));
      localStorage.setItem(
        "playerSettings",
        JSON.stringify({
          autoPlayNext,
          repeatMode,
          darkMode,
          sidebarWidth,
          sidebarCollapsed,
          activeTab
        })
      );
    } catch {
      console.warn("Failed to save settings");
    }
  }

  function addToRecentFiles(filePath: string): void {
    recentFiles = [filePath, ...recentFiles.filter((f) => f !== filePath)].slice(0, 10);
    saveSettings();
  }

  function addToPlaylist(filePath: string): void {
    const fileName = filePath.split("/").pop() || filePath;
    const id = crypto.randomUUID();

    if (playlist.some((item) => item.path === filePath)) {
      return;
    }

    const newItem: PlaylistItem = {
      id,
      name: fileName,
      path: filePath
    };

    playlist = [...playlist, newItem];
    saveSettings();
  }

  window.electron.ipcRenderer.on("video-file-loaded", async (_ev, filePaths: string[]) => {
    console.log("Received filePaths:", filePaths);
    playerState.error = null;
    playerState.isLoading = true;

    if (filePaths.length === 1) {
      const filePath = filePaths[0];
      console.log("Loading video file:", filePath);

      playerState.videoSrc = `file://${filePath}`;
      console.log("Video source set to:", playerState.videoSrc);

      addToRecentFiles(filePath);
      addToPlaylist(filePath);

      const playlistItem = playlist.find((item) => item.path === filePath);
      if (playlistItem) {
        currentPlaylistItem = playlistItem.id;
      }
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

  function playPlaylistItem(item: PlaylistItem): void {
    playerState.error = null;
    playerState.isLoading = true;
    playerState.videoSrc = `file://${item.path}`;
    currentPlaylistItem = item.id;
    addToRecentFiles(item.path);
  }

  function removeFromPlaylist(id: string): void {
    playlist = playlist.filter((item) => item.id !== id);
    if (currentPlaylistItem === id) {
      currentPlaylistItem = null;
    }
    saveSettings();
  }

  function clearPlaylist(): void {
    playlist = [];
    currentPlaylistItem = null;
    saveSettings();
  }

  function shufflePlaylist(): void {
    const shuffled = [...playlist];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playlist = shuffled;
    saveSettings();
  }

  // FileBrowser event handlers
  function handleFileSelect(filePath: string): void {
    playerState.error = null;
    playerState.isLoading = true;
    playerState.videoSrc = `file://${filePath}`;
    addToRecentFiles(filePath);
    addToPlaylist(filePath);

    const playlistItem = playlist.find((item) => item.path === filePath);
    if (playlistItem) {
      currentPlaylistItem = playlistItem.id;
    }
  }

  function handleFolderSelect(folderPath: string): void {
    console.log("Folder selected:", folderPath);
  }

  function getVideoElement(): HTMLVideoElement | null {
    return videoElement;
  }

  function handleResizeStart(event: MouseEvent): void {
    event.preventDefault();
    isResizing = true;
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", handleResizeEnd);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function handleResize(event: MouseEvent): void {
    if (!isResizing) return;

    const newWidth = window.innerWidth - event.clientX;
    const minWidth = 200;
    const maxWidth = Math.min(600, window.innerWidth * 0.5);

    sidebarWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    saveSettings();
  }

  function handleResizeEnd(): void {
    isResizing = false;
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", handleResizeEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  function toggleSidebar(): void {
    sidebarCollapsed = !sidebarCollapsed;
    saveSettings();
  }

  function checkScreenSize(): void {
    if (typeof window !== "undefined") {
      const newIsMobile = window.innerWidth < 768;
      const wasDesktop = !isMobile;
      isMobile = newIsMobile;

      if (isMobile && wasDesktop && !sidebarCollapsed) {
        sidebarCollapsed = true;
        saveSettings();
      } else if (!isMobile && !wasDesktop && sidebarCollapsed) {
        sidebarCollapsed = false;
        saveSettings();
      }
    }
  }

  function handleWindowResize(): void {
    checkScreenSize();
    // Adjust sidebar width on smaller screens
    if (isMobile && sidebarWidth > 280) {
      sidebarWidth = 280;
      saveSettings();
    }
  }

  function switchTab(tab: "playlist" | "info" | "browser"): void {
    activeTab = tab;
    saveSettings();
  }

  loadSettings();

  if (typeof window !== "undefined") {
    checkScreenSize();
    window.addEventListener("resize", handleWindowResize);
  }
</script>

<div class="bg-player-bg text-player-text dark flex h-screen flex-col">
  <div class="flex w-full flex-1 overflow-hidden">
    <main class="relative flex-1 bg-black">
      {#if !isMobile && sidebarCollapsed}
        <button
          onclick={toggleSidebar}
          class="bg-player-surface/90 text-player-text hover:bg-player-accent absolute right-4 top-4 z-50 rounded-lg p-2 shadow-lg backdrop-blur-sm transition-all duration-200"
          title="Show sidebar"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      {/if}

      <!-- {#if isMobile}
        <button
          onclick={toggleSidebar}
          class="absolute top-4 right-4 z-50 bg-player-surface/90 backdrop-blur-sm text-player-text p-3 rounded-lg shadow-lg hover:bg-player-accent transition-all duration-200 touch-manipulation"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          <svg
            class="w-5 h-5 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {#if sidebarCollapsed}
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            {:else}
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            {/if}
          </svg>
        </button>
      {/if} -->

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

      {#if playerState.isLoading && !playerState.videoSrc}
        <div
          class="bg-player-accent absolute left-1/2 top-4 z-50 flex -translate-x-1/2 transform items-center space-x-2 rounded-lg px-4 py-2 text-white shadow-lg"
        >
          <div
            class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          ></div>
          <span>Loading video...</span>
        </div>
      {/if}

      <VideoPlayer
        src={playerState.videoSrc}
        onError={handleVideoError}
        onLoading={handleVideoLoading}
        bind:videoElement
      />
    </main>

    <!-- <Sidebar
      {sidebarCollapsed}
      {sidebarWidth}
      {isMobile}
      {isResizing}
      {activeTab}
      {playlist}
      {currentPlaylistItem}
      {mediaInfo}
      {playerState.videoSrc}
      {isLoading}
      bind:autoPlayNext
      bind:repeatMode
      onToggleSidebar={toggleSidebar}
      onResizeStart={handleResizeStart}
      onSwitchTab={switchTab}
      onPlayPlaylistItem={playPlaylistItem}
      onRemoveFromPlaylist={removeFromPlaylist}
      onClearPlaylist={clearPlaylist}
      onShufflePlaylist={shufflePlaylist}
      onFileSelect={handleFileSelect}
      onFolderSelect={handleFolderSelect}
      getVideoElement={getVideoElement}
      onLoadVideoFile={loadVideoFile}
      onClearVideo={() => {
        playerState.videoSrc = null
        currentPlaylistItem = null
        mediaInfo = null
      }}
      onSaveSettings={saveSettings}
    /> -->
  </div>

  {#if isMobile && !sidebarCollapsed}
    <div
      class="fixed inset-0 z-30 bg-black/50"
      onclick={toggleSidebar}
      onkeydown={(e) => e.key === "Escape" && toggleSidebar()}
      title="Close sidebar"
      role="button"
      tabindex="0"
    ></div>
  {/if}
</div>
