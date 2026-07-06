import type { Bookmark } from "@/lib/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createUserDataStateStorage,
  registerPersistedStoreRehydration,
} from "@/stores/user-data-storage";

export interface BookmarksState {
  bookmarks: Bookmark[];
  lastAddedId: string | null;
  isPanelOpen: boolean;
  lastAction: {
    type: "new" | "duplicate";
    timestamp: number;
  } | null;
}

export interface BookmarksActions {
  addBookmark: (
    videoPath: string,
    timestamp: number,
    label?: string,
  ) => { bookmark: Bookmark; isNew: boolean };
  deleteBookmark: (id: string) => void;
  updateBookmark: (id: string, patch: Partial<Bookmark>) => void;
  clearLastAddedId: () => void;
  setIsPanelOpen: (isOpen: boolean) => void;
}

export type BookmarksStore = BookmarksState & BookmarksActions;

type BookmarksPersisted = Pick<BookmarksState, "bookmarks">;

function isBookmark(value: unknown): value is Bookmark {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Bookmark>;
  return (
    typeof candidate.createdAt === "number" &&
    Number.isFinite(candidate.createdAt) &&
    typeof candidate.id === "string" &&
    (candidate.label === undefined || typeof candidate.label === "string") &&
    typeof candidate.timestamp === "number" &&
    Number.isFinite(candidate.timestamp) &&
    typeof candidate.videoPath === "string"
  );
}

function migrateBookmarksState(persistedState: unknown): BookmarksPersisted {
  if (!persistedState || typeof persistedState !== "object") {
    return { bookmarks: [] };
  }

  const { bookmarks } = persistedState as Partial<BookmarksPersisted>;
  return {
    bookmarks: Array.isArray(bookmarks) ? bookmarks.filter(isBookmark) : [],
  };
}

export const useBookmarksStore = create<BookmarksStore>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      lastAddedId: null,
      isPanelOpen: false,
      lastAction: null,
      addBookmark: (videoPath, timestamp, label) => {
        // Prevent duplicate bookmarks within 0.1s of each other
        const existing = get().bookmarks.find(
          (b) => b.videoPath === videoPath && Math.abs(b.timestamp - timestamp) < 0.1,
        );

        if (existing) {
          set({
            lastAddedId: existing.id,
            lastAction: { type: "duplicate", timestamp: Date.now() },
          });
          return { bookmark: existing, isNew: false };
        }

        const bookmark: Bookmark = {
          createdAt: Date.now(),
          id: crypto.randomUUID(),
          label,
          timestamp,
          videoPath,
        };
        set((state) => ({
          bookmarks: [...state.bookmarks, bookmark],
          lastAddedId: bookmark.id,
          lastAction: { type: "new", timestamp: Date.now() },
        }));
        return { bookmark, isNew: true };
      },
      deleteBookmark: (id) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
          lastAddedId: state.lastAddedId === id ? null : state.lastAddedId,
        }));
      },
      updateBookmark: (id, patch) => {
        set((state) => ({
          bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }));
      },
      clearLastAddedId: () => {
        set({ lastAddedId: null });
      },
      setIsPanelOpen: (isPanelOpen) => {
        set({ isPanelOpen });
      },
    }),
    {
      name: "bookmarks-store",
      storage: createJSONStorage<BookmarksPersisted>(() => createUserDataStateStorage()),
      version: 1,
      migrate: migrateBookmarksState,
      partialize: (state) => ({ bookmarks: state.bookmarks }),
    },
  ),
);

registerPersistedStoreRehydration("bookmarks-store", () => useBookmarksStore.persist.rehydrate());
