import { useEffect, useState } from "react";
import { cleanupHotkeys, initializeHotkeys } from "@/lib/hotkeys";
import { onAddFile, onAddFolder, onOpenSettings } from "@/lib/ipc";
import SidebarPanel from "@/components/SidebarPanel";
import { ThemeProvider } from "@/components/ThemeProvider";
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
import { cn } from "./lib/utils";

export default function App() {
  const sidebar = useSidebarView();
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
    <ThemeProvider>
      <SidebarProvider
        className="h-screen overflow-hidden bg-background"
        onOpenChange={(open) => sidebarCommands.setSidebarOpen(open)}
        open={sidebar.isOpen}
        style={{
          ["--sidebar-width" as string]: `${sidebarWidth}%`,
          ["--sidebar-width-icon" as string]: "3rem"
        }}
      >
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {!sidebar.isOpen ? (
            <div
              className="absolute inset-y-0 z-20 w-4"
              onMouseEnter={() => setIsSidebarPreviewOpen(true)}
              style={{
                [sidebar.position === "left" ? "left" : "right"]: 0
              }}
            />
          ) : (
            <div
              aria-orientation="vertical"
              className="bg-sidebar-border hover:bg-primary/50 absolute inset-y-0 z-30 w-1 cursor-col-resize transition-colors"
              onMouseDown={() => setIsResizing(true)}
              role="separator"
              style={{
                [sidebar.position === "left" ? "left" : "right"]: sidebarEdge
              }}
              tabIndex={-1}
            />
          )}

          {sidebar.position === "left" ? (
            <>
              {sidebar.isOpen ? (
                <Sidebar
                  className="bg-sidebar/80 border-sidebar-border backdrop-blur-md"
                  collapsible="offcanvas"
                  resizing={isResizing}
                  side="left"
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
                    className="h-full"
                    collapsible="none"
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
                  className="bg-sidebar/80 border-sidebar-border backdrop-blur-md"
                  collapsible="offcanvas"
                  resizing={isResizing}
                  side="right"
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
                    className="h-full"
                    collapsible="none"
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
                    className={cn(
                      "flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed text-sm font-medium transition",
                      {
                        "border-primary bg-primary/10 text-primary":
                          sidebar.dropZoneActive === position,
                        "border-border bg-muted/50 text-muted-foreground":
                          sidebar.dropZoneActive !== position
                      }
                    )}
                    key={position}
                    onDragEnter={() => sidebarCommands.setSidebarDropZone(position)}
                    onDragLeave={() => sidebarCommands.setSidebarDropZone(null)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      sidebarCommands.setSidebarDropZone(position);
                    }}
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

        <SettingsDialog />
      </SidebarProvider>
    </ThemeProvider>
  );
}
