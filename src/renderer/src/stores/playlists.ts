import type { Playlist, QueueItem } from "@/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeVideoPath } from "@/lib/media-path";
import {
  createUserDataStateStorage,
  registerPersistedStoreRehydration,
} from "@/stores/user-data-storage";

export interface PlaylistsState {
  playlists: Playlist[];
}

export interface PlaylistsActions {
  addPlaylistItems: (id: string, items: QueueItem[]) => boolean;
  createPlaylist: (name: string, items?: QueueItem[]) => Playlist | null;
  deletePlaylist: (id: string) => boolean;
  removePlaylistItem: (playlistId: string, itemId: string) => boolean;
  renamePlaylist: (id: string, name: string) => boolean;
  replacePlaylistItems: (id: string, items: QueueItem[]) => boolean;
  touchPlaylist: (id: string) => boolean;
}

export type PlaylistsStore = PlaylistsState & PlaylistsActions;

type PlaylistsPersisted = Pick<PlaylistsState, "playlists">;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isQueueItem(value: unknown): value is QueueItem {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<QueueItem>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.path === "string" &&
    (candidate.duration === undefined || isFiniteNumber(candidate.duration))
  );
}

function cloneQueueItems(items: QueueItem[]): QueueItem[] {
  const seenPaths = new Set<string>();
  const playlistItems: QueueItem[] = [];

  for (const item of items) {
    if (!isQueueItem(item)) continue;

    const normalizedPath = normalizeVideoPath(item.path);
    if (seenPaths.has(normalizedPath)) continue;

    seenPaths.add(normalizedPath);
    playlistItems.push({
      ...item,
      duration:
        item.duration !== undefined && Number.isFinite(item.duration) ? item.duration : undefined,
    });
  }

  return playlistItems;
}

function isPlaylist(value: unknown): value is Playlist {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Playlist>;
  return (
    typeof candidate.createdAt === "number" &&
    Number.isFinite(candidate.createdAt) &&
    typeof candidate.id === "string" &&
    Array.isArray(candidate.items) &&
    candidate.items.every(isQueueItem) &&
    (candidate.lastPlayedAt === undefined || isFiniteNumber(candidate.lastPlayedAt)) &&
    typeof candidate.name === "string" &&
    typeof candidate.updatedAt === "number" &&
    Number.isFinite(candidate.updatedAt)
  );
}

function sortPlaylists(playlists: Playlist[]): Playlist[] {
  return [...playlists].sort((a, b) => {
    const aTime = a.lastPlayedAt ?? a.updatedAt;
    const bTime = b.lastPlayedAt ?? b.updatedAt;
    return bTime - aTime;
  });
}

function migratePlaylistsState(persistedState: unknown): PlaylistsPersisted {
  if (!persistedState || typeof persistedState !== "object") {
    return { playlists: [] };
  }

  const { playlists } = persistedState as Partial<PlaylistsPersisted>;
  return {
    playlists: Array.isArray(playlists) ? sortPlaylists(playlists.filter(isPlaylist)) : [],
  };
}

function makePlaylist(name: string, items: QueueItem[] = []): Playlist | null {
  const trimmedName = name.trim();
  const playlistItems = cloneQueueItems(items);

  if (!trimmedName) return null;

  const now = Date.now();
  return {
    createdAt: now,
    id: crypto.randomUUID(),
    items: playlistItems,
    name: trimmedName,
    updatedAt: now,
  };
}

export const usePlaylistsStore = create<PlaylistsStore>()(
  persist(
    (set, get) => ({
      playlists: [],
      addPlaylistItems: (id, items) => {
        const playlistItems = cloneQueueItems(items);
        if (playlistItems.length === 0) return false;

        const playlist = get().playlists.find((playlist) => playlist.id === id);
        if (!playlist) return false;

        const existingPaths = new Set(playlist.items.map((item) => normalizeVideoPath(item.path)));
        const itemsToAdd = playlistItems.filter(
          (item) => !existingPaths.has(normalizeVideoPath(item.path)),
        );
        if (itemsToAdd.length === 0) return false;

        const now = Date.now();
        set((state) => ({
          playlists: sortPlaylists(
            state.playlists.map((playlist) =>
              playlist.id === id
                ? {
                    ...playlist,
                    items: [...playlist.items, ...itemsToAdd],
                    updatedAt: now,
                  }
                : playlist,
            ),
          ),
        }));
        return true;
      },
      createPlaylist: (name, items) => {
        const playlist = makePlaylist(name, items);
        if (!playlist) return null;

        set((state) => ({
          playlists: [playlist, ...state.playlists],
        }));
        return playlist;
      },
      deletePlaylist: (id) => {
        if (!get().playlists.some((playlist) => playlist.id === id)) return false;

        set((state) => ({
          playlists: state.playlists.filter((playlist) => playlist.id !== id),
        }));
        return true;
      },
      removePlaylistItem: (playlistId, itemId) => {
        const playlist = get().playlists.find((playlist) => playlist.id === playlistId);
        if (!playlist || !playlist.items.some((item) => item.id === itemId)) return false;

        const now = Date.now();
        set((state) => ({
          playlists: sortPlaylists(
            state.playlists.map((playlist) =>
              playlist.id === playlistId
                ? {
                    ...playlist,
                    items: playlist.items.filter((item) => item.id !== itemId),
                    updatedAt: now,
                  }
                : playlist,
            ),
          ),
        }));
        return true;
      },
      renamePlaylist: (id, name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return false;

        if (!get().playlists.some((playlist) => playlist.id === id)) return false;

        const now = Date.now();
        set((state) => ({
          playlists: sortPlaylists(
            state.playlists.map((playlist) =>
              playlist.id === id ? { ...playlist, name: trimmedName, updatedAt: now } : playlist,
            ),
          ),
        }));
        return true;
      },
      replacePlaylistItems: (id, items) => {
        const playlistItems = cloneQueueItems(items);
        if (playlistItems.length === 0) return false;

        if (!get().playlists.some((playlist) => playlist.id === id)) return false;

        const now = Date.now();
        set((state) => ({
          playlists: sortPlaylists(
            state.playlists.map((playlist) =>
              playlist.id === id ? { ...playlist, items: playlistItems, updatedAt: now } : playlist,
            ),
          ),
        }));
        return true;
      },
      touchPlaylist: (id) => {
        if (!get().playlists.some((playlist) => playlist.id === id)) return false;

        const now = Date.now();
        set((state) => ({
          playlists: sortPlaylists(
            state.playlists.map((playlist) =>
              playlist.id === id ? { ...playlist, lastPlayedAt: now } : playlist,
            ),
          ),
        }));
        return true;
      },
    }),
    {
      name: "playlists-store",
      storage: createJSONStorage<PlaylistsPersisted>(() => createUserDataStateStorage()),
      version: 1,
      migrate: migratePlaylistsState,
      partialize: (state) => ({ playlists: sortPlaylists(state.playlists) }),
    },
  ),
);

registerPersistedStoreRehydration("playlists-store", () => usePlaylistsStore.persist.rehydrate());
