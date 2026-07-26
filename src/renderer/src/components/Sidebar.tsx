import type { SidebarTab } from "@/types";
import {
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings";
import { useSidebarStore } from "@/stores/sidebar";
import { FileBrowserPanel } from "./file-browser/FileBrowserPanel";
import { PlaylistsPanel } from "./queue/PlaylistsPanel";
import { QueuePanel } from "./queue/QueuePanel";

export function Sidebar() {
  const currentTab = useSidebarStore((state) => state.currentTab);
  const position = useSidebarStore((state) => state.position);
  const isOpen = useSidebarStore((state) => state.isOpen);
  const toggleSidebar = useSidebarStore((state) => state.toggleSidebar);
  const setSidebarTab = useSidebarStore((state) => state.setSidebarTab);
  const setSidebarDragging = useSidebarStore((state) => state.setSidebarDragging);
  const setSettingsDialogOpen = useSettingsStore((state) => state.setSettingsDialogOpen);

  const isLeft = position === "left";

  return (
    <Tabs
      className="group/sidebar relative flex h-full flex-col overflow-hidden"
      onValueChange={(value) => setSidebarTab(value as SidebarTab)}
      value={currentTab}
    >
      <div
        className={cn(
          "absolute top-1/2 z-50 h-12 w-1 -translate-y-1/2 rounded-full",
          "bg-primary/10 opacity-0 transition-all duration-500",
          "group-hover/sidebar:opacity-100 group-active/sidebar:h-20 group-active/sidebar:bg-primary/30",
          isLeft ? "-right-0.5" : "-left-0.5",
        )}
      />

      <div className="px-4 pt-4 pb-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="file-browser">Files</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-0">
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="file-browser">
          <FileBrowserPanel />
        </TabsContent>
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="playlists">
          <PlaylistsPanel />
        </TabsContent>
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="queue">
          <QueuePanel />
        </TabsContent>
      </div>

      <div className="flex items-center justify-between px-5 pt-3 pb-5">
        <Button
          className="text-muted-foreground/60 hover:bg-primary/10 hover:text-primary h-8 w-8 transition-colors"
          onClick={toggleSidebar}
          size="icon"
          variant="ghost"
          title={isOpen ? "Collapse Sidebar" : "Pin Sidebar"}
        >
          {isLeft ? (
            isOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )
          ) : isOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </Button>

        <div
          className="group flex flex-1 cursor-grab items-center justify-center py-2 active:cursor-grabbing"
          onMouseDown={(e) => {
            e.preventDefault();
            setSidebarDragging(true);
          }}
        >
          <div className="bg-foreground/10 group-hover:bg-primary/40 group-active:bg-primary/60 h-1 w-12 rounded-full transition-all group-hover:w-16 group-active:w-20" />
        </div>

        <Button
          className="text-muted-foreground/60 hover:bg-primary/10 hover:text-primary h-8 w-8 transition-colors"
          onClick={() => setSettingsDialogOpen(true)}
          size="icon"
          variant="ghost"
          title="Settings"
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </Tabs>
  );
}
