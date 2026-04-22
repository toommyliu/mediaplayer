import { BookmarkCheck, BookmarkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useBookmarksStore } from "@/stores/bookmarks";
import { usePlayerStore } from "@/stores/player";

export function BookmarkIndicator() {
  const lastAction = useBookmarksStore(state => state.lastAction);
  const showControls = usePlayerStore(state => state.showControls);
  const [isVisible, setIsVisible] = useState(false);
  const [type, setType] = useState<"new" | "duplicate" | null>(null);

  useEffect(() => {
    if (lastAction && !showControls && Date.now() - lastAction.timestamp < 150) {
      setType(lastAction.type);
      setIsVisible(true);
      const timer = setTimeout(setIsVisible, 1500, false);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastAction, showControls]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-[104px] bottom-6 z-50 flex items-center justify-center will-change-[transform,opacity]",
        "transition-[transform,opacity] duration-300",
        isVisible
          ? "translate-y-0 scale-100 opacity-100 ease-out"
          : "translate-y-2 scale-95 opacity-0 ease-in",
      )}
      style={{
        transitionTimingFunction: "var(--ease-out)",
      }}
    >
      <div className="relative">
        <div
          className={cn(
            "absolute inset-0 -m-3 rounded-full bg-emerald-400/5 blur-xl transition-opacity duration-1000",
            isVisible ? "opacity-100" : "opacity-0",
            type === "duplicate" && "bg-amber-400/5",
          )}
        />

        <div
          className={cn(
            "bg-black/40 border-white/10 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm shadow-xl",
            type === "duplicate" && "border-amber-400/20",
          )}
        >
          {type === "new"
            ? (
                <BookmarkCheck
                  className="size-4 text-emerald-400 animate-pop-spring!"
                />
              )
            : (
                <BookmarkIcon
                  className="size-4 text-amber-400 animate-recoil!"
                />
              )}
        </div>

        {isVisible && type === "new" && (
          <div className="animate-ping-once absolute inset-0 flex items-center justify-center">
            <div className="size-8 rounded-full border border-emerald-400/30" />
          </div>
        )}
      </div>
    </div>
  );
}
