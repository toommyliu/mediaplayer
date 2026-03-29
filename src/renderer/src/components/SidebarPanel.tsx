import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  SettingsIcon,
} from "@/lib/icons";
import {
  settingsCommands,
  sidebarCommands,
  useSidebarView
} from "@/lib/store";
import { QueuePanel } from "./queue/QueuePanel";
import { FileBrowserPanel } from './file-browser/FileBrowserPanel';

export default function SidebarPanel() {
  const sidebar = useSidebarView();

  return (
    <Tabs
      className="flex h-full flex-col overflow-hidden"
      onValueChange={(value) => sidebarCommands.setSidebarTab(value as any)}
      value={sidebar.currentTab}
    >
      <SidebarHeader className="px-4 pb-1 pt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file-browser">Files</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 px-4 pt-0">
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="file-browser">
          <FileBrowserPanel />
        </TabsContent>
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="queue">
          <QueuePanel />
        </TabsContent>
      </SidebarContent>

      <SidebarFooter className="px-4 pt-2 pb-4">
        <div className="flex items-center justify-between gap-2">
          <button
            className="h-7 px-2 text-xs"
            onClick={() => settingsCommands.setSettingsDialogOpen(true)}
            type="button"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>

          <div
            className="group flex cursor-grab items-center justify-center px-2 py-2 active:cursor-grabbing"
            draggable
            onDragEnd={() => sidebarCommands.setSidebarDragging(false)}
            onDragStart={() => sidebarCommands.setSidebarDragging(true)}
          >
            <div className="bg-border h-1 w-16 rounded-full opacity-60 transition group-hover:w-24 group-hover:opacity-100" />
          </div>
        </div>
      </SidebarFooter>
    </Tabs>
  );
}
