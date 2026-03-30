import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { bootstrapApp } from "@/actions/app";
import { handleAddFileEvent, handleAddFolderEvent } from "@/actions/library";
import { Providers } from "@/components/Providers";
import SettingsDialog from "@/components/settings/SettingsDialog";
import { Sidebar } from "@/components/Sidebar";
import { Kbd } from "@/components/ui/kbd";
import VideoPlayer from "@/components/video-player/VideoPlayer";
import { onAddFile, onAddFolder, onOpenSettings } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings";
import { useSidebarStore } from "@/stores/sidebar";

const PEEK_WIDTH = "18rem";
const PEEK_DELAY_MS = 80;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export default function App() {
  const isOpen = useSidebarStore(state => state.isOpen);
  const position = useSidebarStore(state => state.position);
  const width = useSidebarStore(state => state.width);
  const isDragging = useSidebarStore(state => state.isDragging);
  const setSidebarWidth = useSidebarStore(state => state.setSidebarWidth);
  const setSidebarPosition = useSidebarStore(
    state => state.setSidebarPosition,
  );
  const setSidebarDragging = useSidebarStore(
    state => state.setSidebarDragging,
  );
  const setSettingsDialogOpen = useSettingsStore(
    state => state.setSettingsDialogOpen,
  );

  const [isResizing, setIsResizing] = useState(false);
  const draftWidthRef = useRef(width);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPeeking, setIsPeeking] = useState(false);
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastPositionRef = useRef(position);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (lastPositionRef.current !== position) {
      setIsCommitting(true);
      timer = setTimeout(setIsCommitting, 50, false);
      lastPositionRef.current = position;
    }
    return () => {
      if (timer)
        clearTimeout(timer);
    };
  }, [position]);

  const isLeft = position === "left";

  const startPeek = useCallback(() => {
    if (isOpen)
      return;
    clearTimeout(peekTimeoutRef.current);
    setIsPeeking(true);
  }, [isOpen]);

  const endPeek = useCallback(() => {
    peekTimeoutRef.current = setTimeout(() => {
      if (sidebarContainerRef.current?.matches(":hover")) {
        return;
      }
      setIsPeeking(false);
    }, PEEK_DELAY_MS);
  }, []);

  useEffect(() => {
    if (isOpen)
      setIsPeeking(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isResizing)
      return;

    const onMouseMove = (e: MouseEvent) => {
      const pct = isLeft
        ? (e.clientX / window.innerWidth) * 100
        : ((window.innerWidth - e.clientX) / window.innerWidth) * 100;

      draftWidthRef.current = pct;

      if (containerRef.current) {
        containerRef.current.style.setProperty("--sidebar-width", `${pct}%`);
      }
    };

    const onMouseUp = () => {
      setSidebarWidth(draftWidthRef.current);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, isLeft, setSidebarWidth]);

  useEffect(() => {
    if (!isResizing) {
      draftWidthRef.current = width;
      if (containerRef.current) {
        containerRef.current.style.setProperty("--sidebar-width", `${width}%`);
      }
    }
  }, [isResizing, width]);

  useEffect(() => {
    if (!isDragging)
      return;
    const onMouseMove = (e: MouseEvent) => {
      setDropSide(e.clientX < window.innerWidth / 2 ? "left" : "right");
    };
    const onMouseUp = (e: MouseEvent) => {
      const side = e.clientX < window.innerWidth / 2 ? "left" : "right";
      setSidebarPosition(side);
      setSidebarDragging(false);
      setDropSide(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarDragging(false);
        setDropSide(null);
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDragging, setSidebarPosition, setSidebarDragging]);

  useEffect(() => {
    void bootstrapApp();
    const disposers = [
      onAddFile((result) => {
        void handleAddFileEvent(result);
      }),
      onAddFolder((result) => {
        void handleAddFolderEvent(result);
      }),
      onOpenSettings(() => {
        setSettingsDialogOpen(true);
      }),
    ];
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, [setSettingsDialogOpen]);

  return (
    <Providers>
      <div
        className="relative flex h-screen overflow-hidden"
        ref={containerRef}
        style={
          {
            "--sidebar-width": isOpen ? `${width}%` : PEEK_WIDTH,
          } as React.CSSProperties
        }
      >
        {isDragging && (
          <div
            className="bg-background/20 pointer-events-none absolute inset-0 z-100 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
            style={{ transitionTimingFunction: EASE_OUT }}
          >
            <div
              className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-200"
              style={{ transitionTimingFunction: EASE_OUT }}
            >
              <div className="bg-background/80 border-border/50 flex w-[360px] gap-2 rounded-3xl border p-2 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] backdrop-blur-xl">
                <div
                  className={cn(
                    "relative flex-1 rounded-2xl p-6 transition-all duration-300",
                    dropSide === "left"
                      ? "bg-primary/5"
                      : "bg-transparent",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-0 rounded-2xl border-2 border-dashed transition-all duration-300",
                      dropSide === "left"
                        ? "border-primary/40 scale-[0.98]"
                        : "border-transparent",
                    )}
                  />
                  <div className="relative flex flex-col items-center gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-200",
                        dropSide === "left"
                          ? "border-primary bg-primary/10 text-primary scale-[1.05]"
                          : "border-border bg-background/50 text-muted-foreground/50",
                      )}
                      style={{ transitionTimingFunction: EASE_OUT }}
                    >
                      <ArrowLeft className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p
                        className={cn(
                          "text-sm font-semibold transition-colors duration-300",
                          dropSide === "left"
                            ? "text-primary"
                            : "text-foreground",
                        )}
                      >
                        Left
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "relative flex-1 rounded-2xl p-6 transition-all duration-300",
                    dropSide === "right"
                      ? "bg-primary/5"
                      : "bg-transparent",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-0 rounded-2xl border-2 border-dashed transition-all duration-300",
                      dropSide === "right"
                        ? "border-primary/40 scale-[0.98]"
                        : "border-transparent",
                    )}
                  />
                  <div className="relative flex flex-col items-center gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-200",
                        dropSide === "right"
                          ? "border-primary bg-primary/10 text-primary scale-[1.05]"
                          : "border-border bg-background/50 text-muted-foreground/50",
                      )}
                      style={{ transitionTimingFunction: EASE_OUT }}
                    >
                      <ArrowRight className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p
                        className={cn(
                          "text-sm font-semibold transition-colors duration-300",
                          dropSide === "right"
                            ? "text-primary"
                            : "text-foreground",
                        )}
                      >
                        Right
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-2 text-[13px] font-medium text-foreground/70 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ transitionTimingFunction: EASE_OUT }}
              >
                Press
                {" "}
                <Kbd className="h-6 min-w-8 font-bold shadow-sm uppercase tracking-tighter text-[11px] text-foreground bg-muted/80">
                  Esc
                </Kbd>
                {" "}
                to cancel
              </div>
            </div>
          </div>
        )}

        <div
          ref={sidebarContainerRef}
          className={cn(
            "absolute inset-y-0 z-20 flex flex-col",
            "bg-sidebar/95 border-sidebar-border",
            isOpen && "border-r shadow-none",
            !isOpen && [
              "top-2 bottom-2 border shadow-2xl",
              isLeft ? "rounded-r-2xl" : "rounded-l-2xl",
              !isCommitting && "transition-transform duration-300 ease-out",
              isPeeking
                ? "translate-x-0 opacity-100"
                : cn(
                    "pointer-events-none opacity-0",
                    isLeft ? "-translate-x-full" : "translate-x-full",
                  ),
            ],
            isLeft ? "left-0" : "right-0",
            !isLeft && isOpen && "border-l border-r-0",
          )}
          style={{ width: "var(--sidebar-width)" }}
          onMouseEnter={startPeek}
          onMouseLeave={endPeek}
        >
          <Sidebar />
        </div>

        {!isOpen && (
          <div
            className={cn(
              "absolute inset-y-0 z-30 w-3",
              isLeft ? "left-0" : "right-0",
            )}
            onMouseEnter={startPeek}
            onMouseLeave={endPeek}
          />
        )}

        {isOpen && (
          <div
            className={cn(
              "absolute inset-y-0 z-30 w-4 cursor-col-resize",
              isLeft ? "-translate-x-1/2" : "translate-x-1/2",
              "transition-colors duration-300",
            )}
            style={{ [isLeft ? "left" : "right"]: "var(--sidebar-width)" }}
            onMouseDown={() => setIsResizing(true)}
          >
            <div
              className={cn(
                "absolute inset-y-0 w-px bg-sidebar-border transition-colors",
                isLeft ? "left-1/2" : "right-1/2",
                isResizing && "bg-primary",
              )}
            />
          </div>
        )}

        <div
          className={cn(
            "flex-1 min-w-0",
            !isCommitting && !isResizing && "transition-[margin] duration-300",
          )}
          style={{
            [isLeft ? "marginLeft" : "marginRight"]: isOpen
              ? "var(--sidebar-width)"
              : 0,
          }}
        >
          <VideoPlayer />
        </div>
      </div>

      <SettingsDialog />
    </Providers>
  );
}
