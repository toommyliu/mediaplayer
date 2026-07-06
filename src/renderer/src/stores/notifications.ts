import type { NotificationPosition } from "@/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createUserDataStateStorage } from "@/stores/user-data-storage";

export interface NotificationsState {
  upNextEnabled: boolean;
  upNextPosition: NotificationPosition;
  videoInfoEnabled: boolean;
}

export interface NotificationsActions {
  setNotificationSettings: (patch: Partial<NotificationsState>) => void;
}

export type NotificationsStore = NotificationsState & NotificationsActions;

type NotificationsPersisted = NotificationsState;

const NOTIFICATION_POSITIONS = new Set<NotificationPosition>([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]);

function migrateNotificationsState(persistedState: unknown): NotificationsPersisted {
  if (!persistedState || typeof persistedState !== "object") {
    return {
      upNextEnabled: true,
      upNextPosition: "top-right",
      videoInfoEnabled: true,
    };
  }

  const state = persistedState as Partial<NotificationsPersisted>;
  return {
    upNextEnabled: typeof state.upNextEnabled === "boolean" ? state.upNextEnabled : true,
    upNextPosition: NOTIFICATION_POSITIONS.has(state.upNextPosition as NotificationPosition)
      ? (state.upNextPosition as NotificationPosition)
      : "top-right",
    videoInfoEnabled: typeof state.videoInfoEnabled === "boolean" ? state.videoInfoEnabled : true,
  };
}

export const useNotificationsStore = create<NotificationsStore>()(
  persist(
    (set) => ({
      upNextEnabled: true,
      upNextPosition: "top-right",
      videoInfoEnabled: true,
      setNotificationSettings: (patch) => set((state) => ({ ...state, ...patch })),
    }),
    {
      name: "notifications-store",
      storage: createJSONStorage<NotificationsPersisted>(() => createUserDataStateStorage()),
      version: 1,
      migrate: migrateNotificationsState,
      partialize: (state) => ({
        upNextEnabled: state.upNextEnabled,
        upNextPosition: state.upNextPosition,
        videoInfoEnabled: state.videoInfoEnabled,
      }),
    },
  ),
);
