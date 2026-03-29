import { useQueueState } from "@/lib/state/queue";
import { useNotificationsStore } from "@stores/notifications";

export interface VideoInfoOverlayProps {
  visible: boolean;
}

export function VideoInfoOverlay({ visible }: VideoInfoOverlayProps) {
  const videoInfoEnabled = useNotificationsStore((state) => state.videoInfoEnabled);
  const index = useQueueState((state) => state.index);
  const items = useQueueState((state) => state.items);
  const currentItem = useQueueState((state) =>
    state.items.length > 0 ? (state.items[state.index] ?? null) : null
  );

  if (!visible || !currentItem || !videoInfoEnabled) return null;

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-20 w-full bg-linear-to-b from-black/70 via-black/40 to-transparent p-8 pb-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {currentItem.name}
        </h1>
        {items.length > 1 ? (
          <p className="text-sm font-medium text-white/75">
            Video {index + 1} of {items.length}
          </p>
        ) : null}
      </div>
    </div>
  );
}
