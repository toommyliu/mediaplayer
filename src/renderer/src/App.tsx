import { useEffect, useState } from "react";
import { onAddFile, onAddFolder, onOpenSettings } from "@/lib/ipc";
import SidebarPanel from "@/components/SidebarPanel";
import { HotkeysProvider } from "@/components/HotkeysProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import VideoPlayer from "@/components/video-player/VideoPlayer";
import SettingsDialog from "@/components/settings/SettingsDialog";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { bootstrapApp } from "@/lib/controllers/app-controller";
import { handleAddFileEvent, handleAddFolderEvent } from "@/lib/controllers/library-controller";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "./lib/utils";
import { useSettingsStore } from "@stores/settings";
import { useSidebarStore } from "@stores/sidebar";

export default function App() {
  const dropZoneActive = useSidebarStore((state) => state.dropZoneActive);
  const isDragging = useSidebarStore((state) => state.isDragging);
  const isOpen = useSidebarStore((state) => state.isOpen);
  const position = useSidebarStore((state) => state.position);
  const width = useSidebarStore((state) => state.width);
  const setSidebarDropZone = useSidebarStore((state) => state.setSidebarDropZone);
  const setSidebarOpen = useSidebarStore((state) => state.setSidebarOpen);
  const setSidebarPosition = useSidebarStore((state) => state.setSidebarPosition);
  const setSidebarWidth = useSidebarStore((state) => state.setSidebarWidth);
  const setSettingsDialogOpen = useSettingsStore((state) => state.setSettingsDialogOpen);
  const [isResizing, setIsResizing] = useState(false);
  const [draftSidebarWidth, setDraftSidebarWidth] = useState(width);
  const [isSidebarPreviewOpen, setIsSidebarPreviewOpen] = useState(false);
  const previewSidebarWidth = "18rem";

  const sidebarWidth = isResizing ? draftSidebarWidth : width;
  const sidebarEdge = isOpen ? `${sidebarWidth}%` : "0px";

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
      })
    ];

    return () => {
      for (const dispose of disposers) dispose();
    };
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      const percentage =
        position === "left"
          ? (event.clientX / window.innerWidth) * 100
          : ((window.innerWidth - event.clientX) / window.innerWidth) * 100;

      setDraftSidebarWidth(percentage);
    };

    const handleMouseUp = () => {
      setSidebarWidth(draftSidebarWidth);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draftSidebarWidth, isResizing, position, setSidebarWidth]);

  useEffect(() => {
    if (isResizing) return;
    setDraftSidebarWidth(width);
  }, [isResizing, width]);

  useEffect(() => {
    if (isOpen) {
      setIsSidebarPreviewOpen(false);
    }
  }, [isOpen]);

  return (
    <HotkeysProvider>
      <TooltipProvider delay={0}>
        <ThemeProvider>
          <SidebarProvider
            className="bg-background h-screen overflow-hidden"
            onOpenChange={setSidebarOpen}
            open={isOpen}
            style={{
              ["--sidebar-width" as string]: `${sidebarWidth}%`,
              ["--sidebar-width-icon" as string]: "3rem"
            }}
          >
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {!isOpen ? (
                <div
                  className="absolute inset-y-0 z-20 w-4"
                  onMouseEnter={() => setIsSidebarPreviewOpen(true)}
                  style={{
                    [position === "left" ? "left" : "right"]: 0
                  }}
                />
              ) : (
                <div
                  aria-orientation="vertical"
                  className="bg-sidebar-border hover:bg-primary/50 absolute inset-y-0 z-30 w-1 cursor-col-resize transition-colors"
                  onMouseDown={() => setIsResizing(true)}
                  role="separator"
                  style={{
                    [position === "left" ? "left" : "right"]: sidebarEdge
                  }}
                  tabIndex={-1}
                />
              )}

              {position === "left" ? (
                <>
                  {isOpen ? (
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

                  {isOpen ? (
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

              {isDragging ? (
                <div className="bg-background/60 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-card flex gap-4 rounded-2xl border p-4 shadow-2xl">
                    {(["left", "right"] as const).map((position) => (
                      <div
                        className={cn(
                          "flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed text-sm font-medium transition",
                          {
                            "border-primary bg-primary/10 text-primary":
                              dropZoneActive === position,
                            "border-border bg-muted/50 text-muted-foreground":
                              dropZoneActive !== position
                          }
                        )}
                        key={position}
                        onDragEnter={() => setSidebarDropZone(position)}
                        onDragLeave={() => setSidebarDropZone(null)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setSidebarDropZone(position);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          setSidebarPosition(position);
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
      </TooltipProvider>
    </HotkeysProvider>
  );
}
