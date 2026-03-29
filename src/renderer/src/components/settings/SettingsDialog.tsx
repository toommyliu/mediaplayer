import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogPanel, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { formatForDisplay, useHotkeyRecorder } from "@tanstack/react-hotkeys";
import { ChevronDownIcon, CloseIcon, MoonIcon, SettingsIcon, SunIcon } from "@/lib/icons";
import {
  hotkeyCommands,
  notificationCommands,
  settingsCommands,
  useHotkeysView,
  useNotificationsView,
  useSettingsView,
  useVolumeView,
  volumeCommands
} from "@/lib/store";
import type { NotificationPosition } from "@/types";

const TABS = [
  { id: "general", label: "General" },
  { id: "playback", label: "Playback" },
  { id: "ui", label: "UI" },
  { id: "shortcuts", label: "Keyboard Shortcuts" }
] as const;

type SettingsTab = (typeof TABS)[number]["id"];

function tabButtonClass(active: boolean): string {
  return active
    ? "w-full justify-start text-left shadow-sm"
    : "w-full justify-start text-left text-muted-foreground";
}

function formatHotkeyDisplay(keys: string[]): string {
  if (keys.length === 0) return "";
  if (keys.length === 1) return formatForDisplay(keys[0]);
  return keys.map((key) => formatForDisplay(key)).join(", ");
}

function ShortcutRow({
  action,
  isRecording,
  editingAction,
  onEdit,
  onCancel
}: {
  action: { id: string; description: string; keys: string[]; configurable?: boolean };
  isRecording: boolean;
  editingAction: string | null;
  onEdit: (id: string) => void;
  onCancel: () => void;
}) {
  const recorder = useHotkeyRecorder({
    onRecord: (hotkey) => {
      hotkeyCommands.updateHotkey(action.id, [hotkey]);
      onCancel();
    },
    onCancel: () => {
      onCancel();
    }
  });

  const isEditing = isRecording && editingAction === action.id;

  useEffect(() => {
    if (isEditing) {
      recorder.startRecording();
    } else {
      recorder.cancelRecording();
    }
  }, [isEditing]);

  return (
    <div className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0">
      <div className="text-muted-foreground text-sm">{action.description}</div>
      <div className="flex items-center gap-2">
        <Kbd className="h-7 text-xs">
          {isEditing
            ? "Press hotkey..."
            : action.keys.length > 0
              ? formatHotkeyDisplay(action.keys)
              : "None"}
        </Kbd>
        {isEditing ? (
          <Button
            className="h-8 w-8 p-0"
            onClick={onCancel}
            size="sm"
            type="button"
            variant="outline"
          >
            <CloseIcon className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            disabled={action.configurable === false}
            onClick={() => onEdit(action.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SettingsDialog() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const settings = useSettingsView();
  const hotkeys = useHotkeysView();
  const volume = useVolumeView();
  const notifications = useNotificationsView();
  const [selectedTab, setSelectedTab] = useState<SettingsTab>("general");
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // useEffect(() => {
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     if (event.key === "Escape") {
  //       if (editingAction) {
  //         setEditingAction(null);
  //       } else {
  //         settingsCommands.setSettingsDialogOpen(false);
  //       }
  //     }
  //   };

  //   window.addEventListener("keydown", handleKeyDown);
  //   return () => window.removeEventListener("keydown", handleKeyDown);
  // }, [editingAction]);

  useEffect(() => {
    if (settings.showDialog) {
      setSelectedTab("general");
    }
  }, [settings.showDialog]);

  const handleResetDefaults = () => {
    hotkeyCommands.clearStoredHotkeys();
    window.location.reload();
  };

  if (!settings.showDialog) return null;

  const filteredCategories = hotkeys.categories
    .map((category) => ({
      ...category,
      actions: category.actions.filter((action) => {
        const display = formatHotkeyDisplay(action.keys);
        return (
          searchTerm.trim() === "" ||
          action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          display.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    }))
    .filter((category) => category.actions.length > 0);

  return (
    <Dialog
      // onOpenChange={(open) => settingsCommands.setSettingsDialogOpen(open)}
      open={settings.showDialog}
    >
      <DialogContent
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden p-0 md:h-[85vh] md:flex-row"
        showCloseButton={false}
      >
        <Button
          className="absolute top-4 right-4 z-10 h-8 w-8 p-0"
          onClick={() => settingsCommands.setSettingsDialogOpen(false)}
          type="button"
          variant="ghost"
        >
          <CloseIcon className="h-4 w-4" />
        </Button>

        <aside className="border-sidebar-border bg-sidebar/60 w-full border-b p-4 md:w-64 md:border-r md:border-b-0">
          <h2 className="text-muted-foreground mb-4 px-3 text-xs font-semibold tracking-[0.18em] uppercase">
            Settings
          </h2>
          <nav
            className="space-y-1"
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
                variant={selectedTab === tab.id ? "secondary" : "ghost"}
              >
                {tab.label}
              </Button>
            ))}
          </nav>
        </aside>

        <DialogPanel className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
          <DialogTitle className="sr-only">Settings</DialogTitle>
          {selectedTab === "general" ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-base font-semibold">Application Theme</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className={tabButtonClass(theme === "light")}
                    onClick={() => setTheme("light")}
                    type="button"
                    variant={theme === "light" ? "secondary" : "outline"}
                  >
                    <span className="inline-flex items-center gap-2">
                      <SunIcon className="h-4 w-4" />
                      Light
                    </span>
                  </Button>
                  <Button
                    className={tabButtonClass(theme === "dark")}
                    onClick={() => setTheme("dark")}
                    type="button"
                    variant={theme === "dark" ? "secondary" : "outline"}
                  >
                    <span className="inline-flex items-center gap-2">
                      <MoonIcon className="h-4 w-4" />
                      Dark
                    </span>
                  </Button>
                  <Button
                    className={tabButtonClass(theme === "system")}
                    onClick={() => setTheme("system")}
                    type="button"
                    variant={theme === "system" ? "secondary" : "outline"}
                  >
                    <span className="inline-flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4" />
                      System ({resolvedTheme})
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {selectedTab === "playback" ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-base font-semibold">Playback</h3>
                <p className="text-muted-foreground mb-3 text-sm">
                  Autoplay follows queue selection and starts on load when a file or folder is
                  opened.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Current Volume</label>
                <input
                  className="accent-primary w-full"
                  max={1}
                  min={0}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    volumeCommands.setVolume(next);
                    if (next > 0) {
                      volumeCommands.setMuted(false);
                    }
                  }}
                  step={0.01}
                  type="range"
                  value={volume.value}
                />
              </div>
            </div>
          ) : null}

          {selectedTab === "ui" ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-base font-semibold">Video Notifications</h3>
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={notifications.upNextEnabled}
                    onCheckedChange={(checked) =>
                      notificationCommands.setNotificationSettings({
                        upNextEnabled: checked === true
                      })
                    }
                  />
                  Show "Up Next" notification
                </label>
              </div>

              <div>
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={notifications.videoInfoEnabled}
                    onCheckedChange={(checked) =>
                      notificationCommands.setNotificationSettings({
                        videoInfoEnabled: checked === true
                      })
                    }
                  />
                  Show video info overlay
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Up Next Position</label>
                <div className="relative max-w-xs">
                  <select
                    className="border-input bg-background h-10 w-full appearance-none rounded-md border px-3 pr-10 text-sm"
                    onChange={(event) =>
                      notificationCommands.setNotificationSettings({
                        upNextPosition: event.target.value as NotificationPosition
                      })
                    }
                    value={notifications.upNextPosition}
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                  <ChevronDownIcon className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
                </div>
              </div>
            </div>
          ) : null}

          {selectedTab === "shortcuts" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold">Keyboard Shortcuts</h3>
                <Button onClick={handleResetDefaults} type="button" variant="outline">
                  Reset to Defaults
                </Button>
              </div>

              <Input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search shortcuts..."
                type="text"
                value={searchTerm}
              />

              {hotkeys.categories.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Shortcut bindings will appear here once the hotkey layer is wired.
                </p>
              ) : (
                filteredCategories.map((category) => (
                  <div className="rounded-lg border" key={category.name}>
                    <div className="border-b px-4 py-3 text-sm font-semibold">{category.name}</div>
                    <div>
                      {category.actions.map((action) => (
                        <ShortcutRow
                          action={action}
                          editingAction={editingAction}
                          isRecording={editingAction !== null}
                          key={action.id}
                          onCancel={() => setEditingAction(null)}
                          onEdit={(id) => setEditingAction(id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </DialogPanel>
      </DialogContent>
    </Dialog>
  );
}
