import type { Playlist } from "../state.svelte";

const PLAYLISTS_STORAGE_KEY = "mediaplayer-playlists";
const CURRENT_PLAYLIST_KEY = "mediaplayer-current-playlist";

/**
 * Save playlists to localStorage
 */
export function savePlaylistsToStorage(playlists: Playlist[]): void {
  try {
    const serialized = JSON.stringify(playlists, (key, value) => {
      // Convert Date objects to ISO strings for serialization
      if (key === "createdAt" && value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, serialized);
  } catch (error) {
    console.error("Failed to save playlists to storage:", error);
  }
}

/**
 * Load playlists from localStorage
 */
export function loadPlaylistsFromStorage(): Playlist[] {
  try {
    const stored = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored, (key, value) => {
      // Convert ISO strings back to Date objects
      if (key === "createdAt" && typeof value === "string") {
        return new Date(value);
      }
      return value;
    });

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load playlists from storage:", error);
    return [];
  }
}

/**
 * Save current playlist ID to localStorage
 */
export function saveCurrentPlaylistId(playlistId: string): void {
  try {
    localStorage.setItem(CURRENT_PLAYLIST_KEY, playlistId);
  } catch (error) {
    console.error("Failed to save current playlist ID:", error);
  }
}

/**
 * Load current playlist ID from localStorage
 */
export function loadCurrentPlaylistId(): string | null {
  try {
    return localStorage.getItem(CURRENT_PLAYLIST_KEY);
  } catch (error) {
    console.error("Failed to load current playlist ID:", error);
    return null;
  }
}

/**
 * Export playlist to JSON file (for sharing/backup)
 */
export function exportPlaylistToFile(playlist: Playlist): void {
  try {
    const dataStr = JSON.stringify(playlist, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${playlist.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_playlist.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  } catch (error) {
    console.error("Failed to export playlist:", error);
  }
}

/**
 * Import playlist from JSON file
 */
export function importPlaylistFromFile(file: File): Promise<Playlist> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error("No file content");
        }

        const playlist = JSON.parse(e.target.result as string, (key, value) => {
          if (key === "createdAt" && typeof value === "string") {
            return new Date(value);
          }
          return value;
        });

        // Validate playlist structure
        if (
          !playlist ||
          typeof playlist !== "object" ||
          !playlist.name ||
          !Array.isArray(playlist.items)
        ) {
          throw new Error("Invalid playlist format");
        }

        // Generate new ID and reset creation date
        playlist.id = Date.now().toString();
        playlist.createdAt = new Date();

        resolve(playlist as Playlist);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse playlist file: ${error instanceof Error ? error.message : "Unknown error"}`
          )
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}
