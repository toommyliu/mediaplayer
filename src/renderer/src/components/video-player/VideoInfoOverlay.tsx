import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@/stores/notifications";
import { useQueueStore } from "@/stores/queue";

export interface VideoInfoOverlayProps {
  visible: boolean;
}

const EXTENSION_REGEX = /\.[^/.]+$/;

export function VideoInfoOverlay({ visible }: VideoInfoOverlayProps) {
  const videoInfoEnabled = useNotificationsStore(
    state => state.videoInfoEnabled,
  );
  const index = useQueueStore(state => state.index);
  const items = useQueueStore(state => state.items);
  const currentItem = useQueueStore(state =>
    state.items.length > 0 ? (state.items[state.index] ?? null) : null,
  );
  const upNextPosition = useNotificationsStore(state => state.upNextPosition);
  const isTop = upNextPosition.startsWith("top");

  function stripExtension(filename: string) {
    return filename.replace(EXTENSION_REGEX, "");
  }

  if (!currentItem || !videoInfoEnabled)
    return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-10 w-full bg-linear-to-b from-black/60 via-black/20 to-transparent p-8 pb-10 transition-all duration-400 ease-out will-change-[transform,opacity]",
        visible
          ? "translate-y-0 opacity-100"
          : cn(
              "opacity-0",
              isTop ? "-translate-y-8" : "translate-y-8", // Usually top, but handle position
            ),
      )}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {stripExtension(currentItem.name)}
        </h1>
        {items.length > 1
          ? (
              <p className="text-sm font-medium text-white/75">
                Video
                {" "}
                {index + 1}
                {" "}
                of
                {" "}
                {items.length}
              </p>
            )
          : null}
      </div>
    </div>
  );
}
