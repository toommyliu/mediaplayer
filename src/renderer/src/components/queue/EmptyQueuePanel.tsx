import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Film } from "lucide-react";

export function EmptyQueuePanel() {
  return <Empty className="h-full py-0">
    <EmptyMedia variant="icon">
      <Film className="size-6 text-muted-foreground/60" />
    </EmptyMedia>
    <EmptyHeader>
      <EmptyTitle className="text-base font-medium">Queue is empty</EmptyTitle>
      <EmptyDescription className="text-xs">
        Add videos to your queue to watch them sequentially.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
}
