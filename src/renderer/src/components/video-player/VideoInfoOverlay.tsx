import {
  useCurrentQueueItem,
  useNotificationsView,
  useQueueView
} from "@/lib/store";

export interface VideoInfoOverlayProps {
  visible: boolean;
}

export function VideoInfoOverlay({ visible }: VideoInfoOverlayProps) {
  const notifications = useNotificationsView();
  const queue = useQueueView();
  const currentItem = useCurrentQueueItem();

  if (!visible || !currentItem || !notifications.videoInfoEnabled) return null;

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-20 w-full bg-linear-to-b from-black/70 via-black/40 to-transparent p-8 pb-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {currentItem.name}
        </h1>
        {queue.items.length > 1 ? (
          <p className="text-sm font-medium text-white/75">
            Video {queue.index + 1} of {queue.items.length}
          </p>
        ) : null}
      </div>
    </div>
  );
}
