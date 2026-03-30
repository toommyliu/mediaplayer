import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import { QueuePanel } from "./queue/QueuePanel";
import { FileBrowserPanel } from "./file-browser/FileBrowserPanel";
import { useSettingsStore } from "@/stores/settings";
import { useSidebarStore } from "@/stores/sidebar";

export function Sidebar() {
  const currentTab = useSidebarStore((state) => state.currentTab);
  const setSidebarTab = useSidebarStore((state) => state.setSidebarTab);
  const setSidebarDragging = useSidebarStore((state) => state.setSidebarDragging);
  const setSettingsDialogOpen = useSettingsStore((state) => state.setSettingsDialogOpen);

  return (
    <Tabs
      className="flex h-full flex-col overflow-hidden"
      onValueChange={(value) => setSidebarTab(value as any)}
      value={currentTab}
    >
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
        <div className="flex items-center justify-between gap-2">
          <button
            className="h-7 px-2 text-xs"
            onClick={() => setSettingsDialogOpen(true)}
            type="button"
          >
            <Settings className="h-4 w-4" />
          </button>

          <div
            className="group flex cursor-grab items-center justify-center px-2 py-2 active:cursor-grabbing"
            onMouseDown={(e) => {
              e.preventDefault();
              setSidebarDragging(true);
            }}
          >
            <div className="bg-border h-1 w-16 rounded-full opacity-60 transition-all group-hover:w-24 group-hover:opacity-100" />
          </div>
        </div>
      </div>
    </Tabs>
  );
}