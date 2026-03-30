import type { NotificationPosition } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      upNextEnabled: true,
      upNextPosition: "top-right",
      videoInfoEnabled: true,
      setNotificationSettings: (patch) =>
        set((state) => ({ ...state, ...patch })),
    }),
    {
      name: "notifications-store",
      partialize: (state) => ({
        upNextEnabled: state.upNextEnabled,
        upNextPosition: state.upNextPosition,
        videoInfoEnabled: state.videoInfoEnabled,
      }),
    },
  ),
);
