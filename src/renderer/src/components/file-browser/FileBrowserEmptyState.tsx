import { Button } from "@/components/ui/button";
import { Empty, EmptyMedia, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Folder } from "lucide-react";

import { libraryCommands } from "@/lib/store";

export function FileBrowserEmptyState() {
  return <Empty className="h-full py-0">
    <EmptyMedia variant="icon">
      <Folder className="size-6 text-muted-foreground/60" />
    </EmptyMedia>
    <EmptyHeader>
      <EmptyTitle className="text-base font-medium">No media loaded</EmptyTitle>
      <EmptyDescription className="text-xs">
        Browse your folders to add media files to the library.
      </EmptyDescription>
    </EmptyHeader>
    <Button
      className="mt-2 h-8 px-4 text-xs"
      onClick={libraryCommands.resetAndBrowseLibrary}
      variant="outline"
    >
      Browse Files
    </Button>
  </Empty>
}