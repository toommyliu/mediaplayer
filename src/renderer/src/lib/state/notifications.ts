import { create } from "zustand";
import type { NotificationPosition } from "@/types";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/state/persistence";

type NotificationsState = {
  upNextEnabled: boolean;
  upNextPosition: NotificationPosition;
  videoInfoEnabled: boolean;
};

const useNotificationsStoreBase = create<NotificationsState>(() => ({
  upNextEnabled: readStorage<boolean>(STORAGE_KEYS.notificationUpNextEnabled, true),
  upNextPosition: readStorage<NotificationPosition>(STORAGE_KEYS.notificationUpNextPosition, "top-right"),
  videoInfoEnabled: readStorage<boolean>(STORAGE_KEYS.notificationVideoInfoEnabled, true)
}));

export function useNotificationsState<T>(selector: (state: NotificationsState) => T): T {
  return useNotificationsStoreBase(selector);
}

export function getNotificationsState(): NotificationsState {
  return useNotificationsStoreBase.getState();
}

export function setNotificationSettings(patch: Partial<NotificationsState>): void {
  const next = {
    ...getNotificationsState(),
    ...patch
  };

  writeStorage(STORAGE_KEYS.notificationUpNextEnabled, next.upNextEnabled);
  writeStorage(STORAGE_KEYS.notificationUpNextPosition, next.upNextPosition);
  writeStorage(STORAGE_KEYS.notificationVideoInfoEnabled, next.videoInfoEnabled);

  useNotificationsStoreBase.setState(next);
}
