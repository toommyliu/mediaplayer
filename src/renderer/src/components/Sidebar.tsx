import type { SidebarTab } from "@/types";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings";
import { useSidebarStore } from "@/stores/sidebar";
import { FileBrowserPanel } from "./file-browser/FileBrowserPanel";
import { QueuePanel } from "./queue/QueuePanel";

export function Sidebar() {
  const currentTab = useSidebarStore((state) => state.currentTab);
  const position = useSidebarStore((state) => state.position);
  const setSidebarTab = useSidebarStore((state) => state.setSidebarTab);
  const setSidebarDragging = useSidebarStore(
    (state) => state.setSidebarDragging,
  );
  const setSettingsDialogOpen = useSettingsStore(
    (state) => state.setSettingsDialogOpen,
  );

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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file-browser">Files</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-0">
        <TabsContent
          className="flex min-h-0 flex-1 flex-col"
          value="file-browser"
        >
          <FileBrowserPanel />
        </TabsContent>
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="queue">
          <QueuePanel />
        </TabsContent>
      </div>

      <div className="flex items-center justify-between px-5 pt-3 pb-5">
        <div
          className="group flex flex-1 cursor-grab items-center justify-center py-2 active:cursor-grabbing"
          onMouseDown={(e) => {
            e.preventDefault();
            setSidebarDragging(true);
          }}
        >
          <div className="h-1 w-12 rounded-full bg-foreground/10 transition-all group-hover:w-16 group-hover:bg-primary/40 group-active:w-20 group-active:bg-primary/60" />
        </div>

        <Button
          className="h-8 w-8 text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
          onClick={() => setSettingsDialogOpen(true)}
          size="icon"
          variant="ghost"
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </Tabs>
  );
}
