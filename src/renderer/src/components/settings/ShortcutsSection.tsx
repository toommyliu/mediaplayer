import { formatForDisplay } from "@tanstack/react-hotkeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHotkeysStore } from "@/stores/hotkeys";
import { ShortcutRow } from "./ShortcutRow";

function formatHotkeyDisplay(keys: string[]): string {
  if (keys.length === 0) return "";
  if (keys.length === 1) return formatForDisplay(keys[0]);
  return keys.map((key) => formatForDisplay(key)).join(", ");
}

export function ShortcutsSection({
  editingAction,
  setEditingAction,
  searchTerm,
  setSearchTerm,
}: {
  editingAction: string | null;
  setEditingAction: (id: string | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) {
  const categories = useHotkeysStore((state) => state.categories);
  const clearStoredHotkeys = useHotkeysStore(
    (state) => state.clearStoredHotkeys,
  );

  const handleResetDefaults = () => {
    clearStoredHotkeys();
    window.location.reload();
  };

  const filteredCategories = categories
    .map((category) => ({
      ...category,
      actions: category.actions.filter((action) => {
        const display = formatHotkeyDisplay(action.keys);
        return (
          searchTerm.trim() === "" ||
          action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          display.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }),
    }))
    .filter((category) => category.actions.length > 0);

  return (
    <div className="flex h-full max-h-[calc(75vh-120px)] flex-col">
      <div className="mb-4 space-y-4 pr-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
          <Button
            className="h-7 px-2 text-[11px]"
            onClick={handleResetDefaults}
            type="button"
            variant="outline"
          >
            Reset to Defaults
          </Button>
        </div>

        <Input
          className="h-8 px-2 text-xs"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search shortcuts..."
          type="text"
          value={searchTerm}
        />
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Shortcut bindings will appear here once the hotkey layer is wired.
        </p>
      ) : (
        <ScrollArea className="-mr-4 flex-1 pr-4" scrollbarGutter>
          <div className="space-y-3 px-1 pt-2 pb-4">
            {filteredCategories.map((category) => (
              <div
                className="ring-foreground/10 overflow-hidden rounded-lg ring-1"
                key={category.name}
              >
                <div className="bg-muted/40 border-border/50 border-b px-3 py-1.5 text-xs font-medium">
                  {category.name}
                </div>
                <div className="divide-border/50 divide-y">
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
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
