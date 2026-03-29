import { useEffect, useState } from "react";
import { cleanupHotkeys, initializeHotkeys } from "@/lib/hotkeys";
import { onAddFile, onAddFolder, onOpenSettings } from "@/lib/ipc";
import { useThemeMode } from "@/hooks/use-theme-mode";
import SidebarPanel from "@/components/SidebarPanel";
import VideoPlayer from "@/components/VideoPlayer";
import SettingsDialog from "@/components/settings/SettingsDialog";
import { useAppStore } from "@/lib/store";

function Resizer({ onMouseDown }: { onMouseDown: () => void }) {
  return (
    <div
      className="z-30 w-1 cursor-col-resize bg-sidebar-border transition-colors hover:bg-primary/50"
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      tabIndex={-1}
    />
  );
}

export default function App() {
  const state = useAppStore();
  const { resolvedTheme, setTheme, theme } = useThemeMode();
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const store = useAppStore.getState();
    store.initializeQueue();
    void store.loadPlatform().then(() => {
      initializeHotkeys();
    });

    const disposers = [
      onAddFile((result) => {
        void useAppStore.getState().handleAddFileEvent(result);
      }),
      onAddFolder((result) => {
        void useAppStore.getState().handleAddFolderEvent(result);
      }),
      onOpenSettings(() => {
        useAppStore.getState().setSettingsDialogOpen(true);
      })
    ];

    return () => {
      cleanupHotkeys();
      for (const dispose of disposers) dispose();
    };
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      const percentage =
        state.sidebar.position === "left"
          ? (event.clientX / window.innerWidth) * 100
          : ((window.innerWidth - event.clientX) / window.innerWidth) * 100;

      useAppStore.getState().setSidebarWidth(percentage);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, state.sidebar.position]);

  const sidebar = state.sidebar.isOpen && !state.sidebar.isDragging ? (
    <div
      className="bg-sidebar/80 border-sidebar-border flex h-full min-w-[240px] flex-col border-r backdrop-blur-md"
      style={{ width: `${state.sidebar.width}%` }}
    >
      <SidebarPanel />
    </div>
  ) : null;

  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {state.sidebar.position === "left" ? (
          <>
            {sidebar}
            {sidebar ? <Resizer onMouseDown={() => setIsResizing(true)} /> : null}
            <div className="min-w-0 flex-1">
              <VideoPlayer />
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <VideoPlayer />
            </div>
            {sidebar ? <Resizer onMouseDown={() => setIsResizing(true)} /> : null}
            {sidebar}
          </>
        )}

        {state.sidebar.isDragging ? (
          <div className="bg-background/60 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-card flex gap-4 rounded-2xl border p-4 shadow-2xl">
              {(["left", "right"] as const).map((position) => (
                <div
                  key={position}
                  className={`flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed text-sm font-medium transition ${
                    state.sidebar.dropZoneActive === position
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground"
                  }`}
                  onDragEnter={() => useAppStore.getState().setSidebarDropZone(position)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    useAppStore.getState().setSidebarDropZone(position);
                  }}
                  onDragLeave={() => useAppStore.getState().setSidebarDropZone(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    useAppStore.getState().setSidebarPosition(position);
                  }}
                >
                  <div className="text-center">
                    <div className="mb-2 text-3xl">{position === "left" ? "←" : "→"}</div>
                    <div>{position === "left" ? "Dock Left" : "Dock Right"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <SettingsDialog
        resolvedTheme={resolvedTheme}
        setTheme={setTheme}
        theme={theme}
      />
    </div>
  );
}
