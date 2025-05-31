import { playlistState, type Playlist, type PlaylistItem } from "../state.svelte";
import {
  savePlaylistsToStorage,
  saveCurrentPlaylistId,
  loadPlaylistsFromStorage,
  loadCurrentPlaylistId
} from "./playlist-persistence";

export class PlaylistManager {
  /**
   * Initialize playlists from storage
   */
  static initializeFromStorage(): void {
    try {
      const storedPlaylists = loadPlaylistsFromStorage();
      const storedCurrentId = loadCurrentPlaylistId();

      if (storedPlaylists.length > 0) {
        playlistState.playlists = storedPlaylists;

        // Set current playlist if stored ID exists and is valid
        if (storedCurrentId && storedPlaylists.some((p) => p.id === storedCurrentId)) {
          playlistState.currentPlaylistId = storedCurrentId;
        } else {
          // Fallback to first playlist or default
          playlistState.currentPlaylistId = storedPlaylists[0]?.id || "default";
        }
      }

      // Ensure default playlist exists
      if (!playlistState.playlists.some((p) => p.id === "default")) {
        this.createDefaultPlaylist();
      }

      console.log("Playlist state initialized from storage:", {
        playlistCount: playlistState.playlists.length,
        currentPlaylist: playlistState.currentPlaylistId
      });
    } catch (error) {
      console.error("Failed to initialize playlists from storage:", error);
      // Fallback: create default playlist
      this.createDefaultPlaylist();
    }
  }

  /**
   * Save current state to storage
   */
  private static saveToStorage(): void {
    savePlaylistsToStorage(playlistState.playlists);
    saveCurrentPlaylistId(playlistState.currentPlaylistId);
  }

  /**
   * Create the default playlist
   */
  private static createDefaultPlaylist(): void {
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
      this.saveToStorage();
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

    // If we deleted the current playlist, switch to default
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
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    playlistState.currentPlaylistId = playlistId;
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
    this.saveToStorage();
    return true;
  }

  static removeItemFromPlaylist(playlistId: string, itemId: string): boolean {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    const index = playlist.items.findIndex((item) => item.id === itemId);
    if (index === -1) return false;

    playlist.items.splice(index, 1);
    playlist.lastModified = new Date();
    this.saveToStorage();
    return true;
  }

  static clearPlaylist(playlistId: string): boolean {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    playlist.items = [];
    playlist.lastModified = new Date();
    this.saveToStorage();
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
    this.saveToStorage();
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
    this.saveToStorage();
    return true;
  }

  static getPlaylistStats(playlistId: string) {
    const playlist = playlistState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return null;

    const totalDuration = playlist.items.reduce((sum, item) => sum + (item.duration || 0), 0);
    const totalSize = playlist.items.reduce((sum, item) => sum + (item.size || 0), 0);

    return {
      itemCount: playlist.items.length,
      totalDuration,
      totalSize,
      avgDuration: playlist.items.length > 0 ? totalDuration / playlist.items.length : 0
    };
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
