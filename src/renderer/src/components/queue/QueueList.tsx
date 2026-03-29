import { ScrollArea } from "@/components/ui/scroll-area";
import { QueueItem } from "./QueueItem";
import { useQueueView } from "@/lib/store";

export function QueueList() {
  const queue = useQueueView();
  return <ScrollArea className="flex-1" scrollFade>
    <div className="pr-1">
      <div className="space-y-1">
        {queue.items.map((item, index) => (
          <QueueItem key={item.id} index={index} item={item} />
        ))}
      </div>
    </div>
  </ScrollArea>
}