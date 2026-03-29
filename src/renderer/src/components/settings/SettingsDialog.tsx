import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogPanel, DialogTitle } from "@/components/ui/dialog";
import { settingsCommands, useSettingsView } from "@/lib/store";
import { GeneralSection } from "./GeneralSection";
import { PlaybackSection } from "./PlaybackSection";
import { UISection } from "./UISection";
import { ShortcutsSection } from "./ShortcutsSection";

const TABS = [
  { id: "general", label: "General" },
  { id: "playback", label: "Playback" },
  { id: "ui", label: "UI" },
  { id: "shortcuts", label: "Keyboard Shortcuts" }
] as const;

type SettingsTab = (typeof TABS)[number]["id"];

function tabButtonClass(active: boolean): string {
  return active
    ? "h-7 w-full justify-start text-left px-2 text-xs font-medium bg-secondary text-secondary-foreground"
    : "h-7 w-full justify-start text-left px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground";
}

export default function SettingsDialog() {
  const settings = useSettingsView();
  const [selectedTab, setSelectedTab] = useState<SettingsTab>("general");
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editingAction) {
          setEditingAction(null);
        } else if (settings.showDialog) {
          settingsCommands.setSettingsDialogOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingAction, settings.showDialog]);

  useEffect(() => {
    if (settings.showDialog) {
      setSelectedTab("general");
    }
  }, [settings.showDialog]);

  if (!settings.showDialog) return null;

  return (
    <Dialog
      onOpenChange={(open) => settingsCommands.setSettingsDialogOpen(open)}
      open={settings.showDialog}
    >
      <DialogContent
        className="ring-foreground/10 flex h-full w-full max-w-4xl flex-col overflow-hidden p-0 ring-1 md:h-[75vh] md:flex-row"
        showCloseButton={false}
      >
        <aside className="border-sidebar-border bg-sidebar/40 w-full border-b p-3 md:w-48 md:border-r md:border-b-0 lg:w-56">
          <h2 className="text-muted-foreground mb-3 px-2 text-sm font-medium">
            Settings
          </h2>
          <nav
            className="space-y-0.5"
            onKeyDown={(event) => {
              const currentIndex = TABS.findIndex((tab) => tab.id === selectedTab);
              let nextIndex = currentIndex;
              if (event.key === "ArrowDown") {
                nextIndex = (currentIndex + 1) % TABS.length;
              } else if (event.key === "ArrowUp") {
                nextIndex = currentIndex === 0 ? TABS.length - 1 : currentIndex - 1;
              } else if (event.key === "Home") {
                nextIndex = 0;
              } else if (event.key === "End") {
                nextIndex = TABS.length - 1;
              } else {
                return;
              }
              event.preventDefault();
              setSelectedTab(TABS[nextIndex].id);
            }}
            role="tablist"
          >
            {TABS.map((tab) => (
              <Button
                aria-selected={selectedTab === tab.id}
                className={tabButtonClass(selectedTab === tab.id)}
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                role="tab"
                type="button"
                variant="ghost"
              >
                {tab.label}
              </Button>
            ))}
          </nav>
        </aside>

        <DialogPanel className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <DialogTitle className="sr-only">Settings</DialogTitle>

          {selectedTab === "general" && <GeneralSection />}
          {selectedTab === "playback" && <PlaybackSection />}
          {selectedTab === "ui" && <UISection />}
          {selectedTab === "shortcuts" && (
            <ShortcutsSection
              editingAction={editingAction}
              searchTerm={searchTerm}
              setEditingAction={setEditingAction}
              setSearchTerm={setSearchTerm}
            />
          )}
        </DialogPanel>
      </DialogContent>
    </Dialog>
  );
}
