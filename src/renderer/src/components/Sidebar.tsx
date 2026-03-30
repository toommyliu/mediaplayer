import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { QueuePanel } from "./queue/QueuePanel";
import { FileBrowserPanel } from "./file-browser/FileBrowserPanel";
import { useSettingsStore } from "@/stores/settings";
import { useSidebarStore } from "@/stores/sidebar";
import { cn } from "@/lib/utils";
import type { SidebarTab } from "@/types";

export function Sidebar() {
  const currentTab = useSidebarStore((state) => state.currentTab);
  const position = useSidebarStore((state) => state.position);
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
          "absolute top-1/2 z-50 h-16 w-0.5 -translate-y-1/2 rounded-full",
          "bg-primary/20 opacity-0 transition-all duration-500",
          "group-hover/sidebar:opacity-100 group-active/sidebar:h-24 group-active/sidebar:bg-primary/40",
          isLeft ? "-right-px" : "-left-px"
        )}
      />

      <div className="px-4 pt-4 pb-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file-browser">Files</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-4 pt-0">
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="file-browser">
          <FileBrowserPanel />
        </TabsContent>
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="queue">
          <QueuePanel />
        </TabsContent>
      </div>

      <div className="px-4 pt-2 pb-4">
        <div className="grid grid-cols-3 items-center">
          <div className="flex items-center justify-start">
            {isLeft && (
              <Button
                className="h-7 px-2 text-xs"
                onClick={() => setSettingsDialogOpen(true)}
                size="icon"
                variant="ghost"
              >
                <Settings className="size-4" />
              </Button>
            )}
          </div>

          <div
            className="group flex cursor-grab items-center justify-center py-2 active:cursor-grabbing"
            onMouseDown={(e) => {
              e.preventDefault();
              setSidebarDragging(true);
            }}
          >
            <div className="bg-border h-1 w-16 rounded-full opacity-60 transition-all group-hover:w-24 group-hover:opacity-100" />
          </div>

          <div className="flex items-center justify-end">
            {!isLeft && (
              <Button
                className="h-7 px-2 text-xs"
                onClick={() => setSettingsDialogOpen(true)}
                size="icon"
                variant="ghost"
              >
                <Settings className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Tabs>
  );
}