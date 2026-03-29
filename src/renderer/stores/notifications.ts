import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NotificationPosition } from "@/types";
import { STORAGE_KEYS, readStorage } from "@/lib/state/persistence";

export interface NotificationsState {
  upNextEnabled: boolean;
  upNextPosition: NotificationPosition;
  videoInfoEnabled: boolean;
}

export interface NotificationsActions {
  setNotificationSettings: (patch: Partial<NotificationsState>) => void;
}

export type NotificationsStore = NotificationsState & NotificationsActions;

export const useNotificationsStore = create<NotificationsStore>()(
  persist(
    (set) => ({
      upNextEnabled: readStorage<boolean>(STORAGE_KEYS.notificationUpNextEnabled, true),
      upNextPosition: readStorage<NotificationPosition>(
        STORAGE_KEYS.notificationUpNextPosition,
        "top-right"
      ),
      videoInfoEnabled: readStorage<boolean>(STORAGE_KEYS.notificationVideoInfoEnabled, true),
      setNotificationSettings: (patch) => set((state) => ({ ...state, ...patch }))
    }),
    {
      name: "notifications-store",
      partialize: (state) => ({
        upNextEnabled: state.upNextEnabled,
        upNextPosition: state.upNextPosition,
        videoInfoEnabled: state.videoInfoEnabled
      })
    }
  )
);
