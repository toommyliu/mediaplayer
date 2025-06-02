import { playlistState, type Playlist, type PlaylistItem } from "../state.svelte";

export class PlaylistManager {
  /**
   * Initialize playlists from storage
   */
  static initializeFromStorage(): void {
    try {
      console.log("[PlaylistManager] Initializing from storage");
      const stored = localStorage.getItem("mediaplayer-playlists");
      const storedCurrentId = localStorage.getItem("mediaplayer-current-playlist");

      if (stored) {
        const parsedPlaylists = JSON.parse(stored, (key, value) => {
          if (
            (key === "createdAt" || key === "lastModified" || key === "addedAt") &&
            typeof value === "string"
          ) {
            return new Date(value);
          }
          return value;
        });

        if (Array.isArray(parsedPlaylists) && parsedPlaylists.length > 0) {
          playlistState.playlists = parsedPlaylists;

          if (storedCurrentId && parsedPlaylists.some((p: Playlist) => p.id === storedCurrentId)) {
            playlistState.currentPlaylistId = storedCurrentId;
          } else {
            playlistState.currentPlaylistId = parsedPlaylists[0]?.id || "default";
          }
        }
      }

      if (!playlistState.playlists.some((p) => p.id === "default")) {
        this.createDefaultPlaylist();
      }

      if (playlistState.hasUnsavedChanges === undefined) {
        playlistState.hasUnsavedChanges = false;
      }

      console.log("Playlist state initialized:", {
        playlistCount: playlistState.playlists.length,
        currentPlaylist: playlistState.currentPlaylistId,
        hasUnsavedChanges: playlistState.hasUnsavedChanges
      });
    } catch (error) {
      console.error("Failed to initialize playlists from storage:", error);
      this.createDefaultPlaylist();
      playlistState.hasUnsavedChanges = false;
    }
  }

  /**
   * Save current state to storage
   */
  private static saveToStorage(): void {
    try {
      console.log("[PlaylistManager] Saving to storage");
      const serialized = JSON.stringify(playlistState.playlists, (key, value) => {
        if (
          (key === "createdAt" || key === "lastModified" || key === "addedAt") &&
          value instanceof Date
        ) {
          return value.toISOString();
        }
        return value;
      });
      localStorage.setItem("mediaplayer-playlists", serialized);
      localStorage.setItem("mediaplayer-current-playlist", playlistState.currentPlaylistId);
      console.log("[PlaylistManager] Successfully saved to storage");
    } catch (error) {
      console.error("Failed to save playlists to storage:", error);
    }
  }

  /**
   * Create the default playlist
   */
  private static createDefaultPlaylist(): void {
    console.log("[PlaylistManager] Creating default playlist");
    const defaultPlaylist: Playlist = {
      id: "default",
      name: "Default Playlist",
      description: "Your main playlist",
      items: [],
      createdAt: new Date(),
      lastModified: new Date()
    };

    if (!playlistState.playlists.some((p) => p.id === "default")) {
      playlistState.playlists.push(defaultPlaylist);
      playlistState.currentPlaylistId = "default";
      this.saveToStorage();
      console.log("[PlaylistManager] Default playlist created and saved");
    }
  }

  static createPlaylist(name: string, description?: string): Playlist {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      description,
      items: [],
      createdAt: new Date(),
      lastModified: new Date()
    };

    playlistState.playlists.push(newPlaylist);
    this.saveToStorage();
    return newPlaylist;
  }

  static deletePlaylist(playlistId: string): boolean {
    const index = playlistState.playlists.findIndex((p) => p.id === playlistId);
    if (index === -1 || playlistId === "default") return false;

    playlistState.playlists.splice(index, 1);

    if (playlistState.currentPlaylistId === playlistId) {
      playlistState.currentPlaylistId = "default";
    }

    this.saveToStorage();
    return true;
  }

  static renamePlaylist(playlistId: string, newName: string): boolean {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    playlist.name = newName;
    playlist.lastModified = new Date();
    this.saveToStorage();
    return true;
  }

  static switchToPlaylist(playlistId: string): boolean {
    console.log(`[PlaylistManager] Switching to playlist: ${playlistId}`);
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      console.error(`[PlaylistManager] Cannot switch to playlist ${playlistId} - not found`);
      return false;
    }

    const previousPlaylistId = playlistState.currentPlaylistId;
    playlistState.currentPlaylistId = playlistId;
    console.log(`[PlaylistManager] Switched from ${previousPlaylistId} to ${playlistId}`);
    console.log(`[PlaylistManager] New playlist has ${playlist.items.length} items`);

    this.saveToStorage();
    return true;
  }

  static addItemToPlaylist(
    playlistId: string,
    item: Omit<PlaylistItem, "id" | "addedAt">
  ): boolean {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    const newItem: PlaylistItem = {
      ...item,
      id: crypto.randomUUID(),
      addedAt: new Date()
    };

    playlist.items.push(newItem);
    playlist.lastModified = new Date();
    playlistState.hasUnsavedChanges = true;
    return true;
  }

  /**
   * Add an item to a playlist without saving to storage immediately.
   * Useful for bulk operations like adding folder contents.
   */
  static addItemToPlaylistUnsaved(
    playlistId: string,
    item: Omit<PlaylistItem, "id" | "addedAt">
  ): boolean {
    console.log(`[PlaylistManager] Attempting to add item to playlist ${playlistId}:`, item);

    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      console.error(
        `[PlaylistManager] Playlist ${playlistId} not found! Available playlists:`,
        playlistState.playlists.map((p) => ({ id: p.id, name: p.name }))
      );
      return false;
    }

    const existingItem = playlist.items.find((existing) => existing.path === item.path);
    if (existingItem) {
      console.warn(`[PlaylistManager] Item already exists in playlist: ${item.path}`);
      return false;
    }

    const newItem: PlaylistItem = {
      ...item,
      id: crypto.randomUUID(),
      addedAt: new Date()
    };

    console.log(`[PlaylistManager] Adding new item with ID: ${newItem.id}`);
    playlist.items.push(newItem);
    playlist.lastModified = new Date();
    playlistState.hasUnsavedChanges = true;
    console.log(`[PlaylistManager] Playlist now has ${playlist.items.length} items`);
    return true;
  }

  /**
   * Add multiple items to a playlist without saving until all are added.
   * This is more efficient for bulk operations.
   */
  static addMultipleItemsToPlaylist(
    playlistId: string,
    items: Omit<PlaylistItem, "id" | "addedAt">[]
  ): boolean {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    const newItems: PlaylistItem[] = items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      addedAt: new Date()
    }));

    playlist.items.push(...newItems);
    playlist.lastModified = new Date();
    playlistState.hasUnsavedChanges = true;
    return true;
  }

  /**
   * Add folder contents to the current playlist without saving immediately.
   * Call saveToStorage() manually when ready to persist.
   */
  static addFolderContentsToCurrentPlaylist(
    videoFiles: { name: string; path: string; duration?: number }[]
  ): boolean {
    console.log(`[PlaylistManager] Adding ${videoFiles.length} files to current playlist`);
    const currentPlaylistId = playlistState.currentPlaylistId;
    if (!currentPlaylistId) {
      console.error("[PlaylistManager] No current playlist ID found");
      return false;
    }

    console.log(`[PlaylistManager] Current playlist ID: ${currentPlaylistId}`);
    console.log(
      `[PlaylistManager] Current playlist items before: ${playlistState.currentPlaylistItems.length}`
    );

    for (const file of videoFiles) {
      console.log(`[PlaylistManager] Adding file: ${file.name} at ${file.path}`);
      const success = this.addItemToPlaylistUnsaved(currentPlaylistId, {
        name: file.name,
        path: file.path,
        duration: file.duration
      });

      if (!success) {
        console.error(`[PlaylistManager] Failed to add file: ${file.name}`);
      }
    }

    console.log(
      `[PlaylistManager] Current playlist items after: ${playlistState.currentPlaylistItems.length}`
    );

    playlistState.hasUnsavedChanges = true;
    console.log(`[PlaylistManager] Set hasUnsavedChanges to true`);

    return true;
  }

  /**
   * Manually save current playlist state to storage.
   * Use this after bulk operations with unsaved methods.
   */
  static saveCurrentState(): void {
    console.log("[PlaylistManager] Manually saving current state");
    this.saveToStorage();
    playlistState.hasUnsavedChanges = false;
    console.log("[PlaylistManager] hasUnsavedChanges reset to false after manual save");
  }

  static removeItemFromPlaylist(playlistId: string, itemId: string): boolean {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    const index = playlist.items.findIndex((item) => item.id === itemId);
    if (index === -1) return false;

    playlist.items.splice(index, 1);
    playlist.lastModified = new Date();
    playlistState.hasUnsavedChanges = true;
    return true;
  }

  static clearPlaylist(playlistId: string): boolean {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    playlist.items = [];
    playlist.lastModified = new Date();
    playlistState.hasUnsavedChanges = true;
    return true;
  }

  static shufflePlaylist(playlistId: string): boolean {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    // Fisher-Yates shuffle algorithm
    for (let i = playlist.items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playlist.items[i], playlist.items[j]] = [playlist.items[j], playlist.items[i]];
    }

    playlist.lastModified = new Date();
    playlistState.hasUnsavedChanges = true;
    return true;
  }

  static duplicatePlaylist(playlistId: string): Playlist | null {
    const sourcePlaylist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!sourcePlaylist) return null;

    const duplicatedPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name: `${sourcePlaylist.name} (Copy)`,
      description: sourcePlaylist.description,
      items: sourcePlaylist.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        addedAt: new Date()
      })),
      createdAt: new Date(),
      lastModified: new Date()
    };

    playlistState.playlists.push(duplicatedPlaylist);
    this.saveToStorage();
    return duplicatedPlaylist;
  }

  static moveItem(playlistId: string, fromIndex: number, toIndex: number): boolean {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    if (
      fromIndex < 0 ||
      fromIndex >= playlist.items.length ||
      toIndex < 0 ||
      toIndex >= playlist.items.length
    ) {
      return false;
    }

    const [movedItem] = playlist.items.splice(fromIndex, 1);
    playlist.items.splice(toIndex, 0, movedItem);
    playlist.lastModified = new Date();
    playlistState.hasUnsavedChanges = true;
    return true;
  }

  static getNextItem(playlistId: string, currentItemId?: string): PlaylistItem | null {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist || playlist.items.length === 0) return null;

    if (!currentItemId) return playlist.items[0];

    const currentIndex = playlist.items.findIndex((item) => item.id === currentItemId);
    if (currentIndex === -1) return playlist.items[0];

    const nextIndex = (currentIndex + 1) % playlist.items.length;
    return playlist.items[nextIndex];
  }

  static getPreviousItem(playlistId: string, currentItemId?: string): PlaylistItem | null {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist || playlist.items.length === 0) return null;

    if (!currentItemId) return playlist.items[playlist.items.length - 1];

    const currentIndex = playlist.items.findIndex((item) => item.id === currentItemId);
    if (currentIndex === -1) return playlist.items[playlist.items.length - 1];

    const prevIndex = currentIndex === 0 ? playlist.items.length - 1 : currentIndex - 1;
    return playlist.items[prevIndex];
  }
}
