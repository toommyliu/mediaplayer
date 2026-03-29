import { useEffect } from "react";
import { useHotkeyRecorder, formatForDisplay } from "@tanstack/react-hotkeys";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { CloseIcon } from "@/lib/icons";
import { hotkeyCommands } from "@/lib/store";

interface ShortcutRowProps {
  action: { id: string; description: string; keys: string[]; configurable?: boolean };
  isRecording: boolean;
  editingAction: string | null;
  onEdit: (id: string) => void;
  onCancel: () => void;
}

function formatHotkeyDisplay(keys: string[]): string {
  if (keys.length === 0) return "";
  if (keys.length === 1) return formatForDisplay(keys[0]);
  return keys.map((key) => formatForDisplay(key)).join(", ");
}

export function ShortcutRow({
  action,
  isRecording,
  editingAction,
  onEdit,
  onCancel
}: ShortcutRowProps) {
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
    <div className="flex items-center justify-between gap-4 border-b border-border/50 px-3 py-2 last:border-b-0">
      <div className="text-muted-foreground text-xs leading-relaxed">{action.description}</div>
      <div className="flex items-center gap-2">
        <Kbd className="h-5 min-w-5 px-1 text-[10px]">
          {isEditing
            ? "Press hotkey..."
            : action.keys.length > 0
              ? formatHotkeyDisplay(action.keys)
              : "None"}
        </Kbd>
        {isEditing ? (
          <Button
            className="size-6 p-0"
            onClick={onCancel}
            size="xs"
            type="button"
            variant="outline"
          >
            <CloseIcon className="size-3" />
          </Button>
        ) : (
          <Button
            className="h-6 px-2 text-[11px]"
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
