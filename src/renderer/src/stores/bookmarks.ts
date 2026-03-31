import type { Bookmark } from "@/lib/contracts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BookmarksState {
  bookmarks: Bookmark[];
  lastAddedId: string | null;
  isPanelOpen: boolean;
}

export interface BookmarksActions {
  addBookmark: (
    videoPath: string,
    timestamp: number,
    label?: string,
  ) => Bookmark;
  deleteBookmark: (id: string) => void;
  updateBookmark: (id: string, patch: Partial<Bookmark>) => void;
  clearLastAddedId: () => void;
  setIsPanelOpen: (isOpen: boolean) => void;
}

export type BookmarksStore = BookmarksState & BookmarksActions;

export const useBookmarksStore = create<BookmarksStore>()(
  persist(
    (set) => ({
      bookmarks: [],
      lastAddedId: null,
      isPanelOpen: false,
      addBookmark: (videoPath, timestamp, label) => {
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
        }));
        return bookmark;
      },
      deleteBookmark: (id) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
          lastAddedId: state.lastAddedId === id ? null : state.lastAddedId,
        }));
      },
      updateBookmark: (id, patch) => {
        set((state) => ({
          bookmarks: state.bookmarks.map((b) =>
            b.id === id ? { ...b, ...patch } : b,
          ),
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
    },
  ),
);
