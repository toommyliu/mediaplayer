import { useEffect, useState } from "react";
import { cleanupHotkeys, initializeHotkeys } from "@/lib/hotkeys";
import { onAddFile, onAddFolder, onOpenSettings } from "@/lib/ipc";
import { useThemeMode } from "@/hooks/use-theme-mode";
import SidebarPanel from "@/components/SidebarPanel";
import VideoPlayer from "@/components/VideoPlayer";
import SettingsDialog from "@/components/settings/SettingsDialog";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  appCommands,
  libraryCommands,
  settingsCommands,
  sidebarCommands,
  useSidebarView
} from "@/lib/store";

export default function App() {
  const sidebar = useSidebarView();
  const { resolvedTheme, setTheme, theme } = useThemeMode();
  const [isResizing, setIsResizing] = useState(false);
  const [draftSidebarWidth, setDraftSidebarWidth] = useState(sidebar.width);
  const [isSidebarPreviewOpen, setIsSidebarPreviewOpen] = useState(false);
  const previewSidebarWidth = "18rem";

  const sidebarWidth = isResizing ? draftSidebarWidth : sidebar.width;
  const sidebarEdge = sidebar.isOpen ? `${sidebarWidth}%` : "0px";

  useEffect(() => {
    void appCommands.bootstrapApp().then(() => {
      initializeHotkeys();
    });

    const disposers = [
      onAddFile((result) => {
        void libraryCommands.handleAddFileEvent(result);
      }),
      onAddFolder((result) => {
        void libraryCommands.handleAddFolderEvent(result);
      }),
      onOpenSettings(() => {
        settingsCommands.setSettingsDialogOpen(true);
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
        sidebar.position === "left"
          ? (event.clientX / window.innerWidth) * 100
          : ((window.innerWidth - event.clientX) / window.innerWidth) * 100;

      setDraftSidebarWidth(percentage);
    };

    const handleMouseUp = () => {
      sidebarCommands.setSidebarWidth(draftSidebarWidth);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draftSidebarWidth, isResizing, sidebar.position]);

  useEffect(() => {
    if (isResizing) return;
    setDraftSidebarWidth(sidebar.width);
  }, [isResizing, sidebar.width]);

  useEffect(() => {
    if (sidebar.isOpen) {
      setIsSidebarPreviewOpen(false);
    }
  }, [sidebar.isOpen]);

  return (
    <SidebarProvider
      className="bg-background h-screen overflow-hidden"
      open={sidebar.isOpen}
      onOpenChange={(open) => sidebarCommands.setSidebarOpen(open)}
      style={{
        ["--sidebar-width" as string]: `${sidebarWidth}%`,
        ["--sidebar-width-icon" as string]: "3rem"
      }}
    >
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {!sidebar.isOpen ? (
          <div
            className="absolute inset-y-0 z-20 w-4"
            style={{
              [sidebar.position === "left" ? "left" : "right"]: 0
            }}
            onMouseEnter={() => setIsSidebarPreviewOpen(true)}
          />
        ) : (
          <div
            className="bg-sidebar-border hover:bg-primary/50 absolute inset-y-0 z-30 w-1 cursor-col-resize transition-colors"
            onMouseDown={() => setIsResizing(true)}
            role="separator"
            aria-orientation="vertical"
            tabIndex={-1}
            style={{
              [sidebar.position === "left" ? "left" : "right"]: sidebarEdge
            }}
          />
        )}

        {sidebar.position === "left" ? (
          <>
            {sidebar.isOpen ? (
              <Sidebar
                collapsible="offcanvas"
                className="bg-sidebar/80 border-sidebar-border backdrop-blur-md"
                side="left"
                resizing={isResizing}
              >
                <SidebarPanel />
              </Sidebar>
            ) : isSidebarPreviewOpen ? (
              <div
                className="border-sidebar-border bg-sidebar/95 absolute top-2 bottom-2 left-0 z-20 w-[18rem] overflow-hidden rounded-r-2xl border shadow-2xl backdrop-blur-md"
                onMouseEnter={() => setIsSidebarPreviewOpen(true)}
                onMouseLeave={() => setIsSidebarPreviewOpen(false)}
              >
                <Sidebar
                  collapsible="none"
                  className="h-full"
                  side="left"
                  style={{ width: previewSidebarWidth }}
                >
                  <SidebarPanel />
                </Sidebar>
              </div>
            ) : null}

            <SidebarInset
              className="min-w-0"
              style={{
                marginLeft: sidebarEdge
              }}
            >
              <VideoPlayer />
            </SidebarInset>
          </>
        ) : (
          <>
            <SidebarInset
              className="min-w-0"
              style={{
                marginRight: sidebarEdge
              }}
            >
              <VideoPlayer />
            </SidebarInset>

            {sidebar.isOpen ? (
              <Sidebar
                collapsible="offcanvas"
                className="bg-sidebar/80 border-sidebar-border backdrop-blur-md"
                side="right"
                resizing={isResizing}
              >
                <SidebarPanel />
              </Sidebar>
            ) : isSidebarPreviewOpen ? (
              <div
                className="border-sidebar-border bg-sidebar/95 absolute top-2 right-0 bottom-2 z-20 w-[18rem] overflow-hidden rounded-l-2xl border shadow-2xl backdrop-blur-md"
                onMouseEnter={() => setIsSidebarPreviewOpen(true)}
                onMouseLeave={() => setIsSidebarPreviewOpen(false)}
              >
                <Sidebar
                  collapsible="none"
                  className="h-full"
                  side="right"
                  style={{ width: previewSidebarWidth }}
                >
                  <SidebarPanel />
                </Sidebar>
              </div>
            ) : null}
          </>
        )}

        {sidebar.isDragging ? (
          <div className="bg-background/60 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-card flex gap-4 rounded-2xl border p-4 shadow-2xl">
              {(["left", "right"] as const).map((position) => (
                <div
                  key={position}
                  className={`flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed text-sm font-medium transition ${
                    sidebar.dropZoneActive === position
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground"
                  }`}
                  onDragEnter={() => sidebarCommands.setSidebarDropZone(position)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    sidebarCommands.setSidebarDropZone(position);
                  }}
                  onDragLeave={() => sidebarCommands.setSidebarDropZone(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    sidebarCommands.setSidebarPosition(position);
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

      <SettingsDialog resolvedTheme={resolvedTheme} setTheme={setTheme} theme={theme} />
    </SidebarProvider>
  );
}
