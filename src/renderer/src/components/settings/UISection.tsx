import { Checkbox } from "@/components/ui/checkbox";
import type { NotificationPosition } from "@/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useNotificationsStore } from "@stores/notifications";

export function UISection() {
  const upNextEnabled = useNotificationsStore((state) => state.upNextEnabled);
  const upNextPosition = useNotificationsStore((state) => state.upNextPosition);
  const videoInfoEnabled = useNotificationsStore((state) => state.videoInfoEnabled);
  const setNotificationSettings = useNotificationsStore((state) => state.setNotificationSettings);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2.5 text-sm font-medium">Video Notifications</h3>
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={upNextEnabled}
              onCheckedChange={(checked) =>
                setNotificationSettings({
                  upNextEnabled: checked === true
                })
              }
            />
            Show "Up Next" notification
          </Label>
          <Label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={videoInfoEnabled}
              onCheckedChange={(checked) =>
                setNotificationSettings({
                  videoInfoEnabled: checked === true
                })
              }
            />
            Show video info overlay
          </Label>
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium">Up Next Position</Label>
        <Select
          value={upNextPosition}
          onValueChange={(value) =>
            setNotificationSettings({
              upNextPosition: value as NotificationPosition
            })
          }
        >
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue>
              {upNextPosition
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" sideOffset={4}>
            <SelectItem value="top-left">Top Left</SelectItem>
            <SelectItem value="top-right">Top Right</SelectItem>
            <SelectItem value="bottom-left">Bottom Left</SelectItem>
            <SelectItem value="bottom-right">Bottom Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
