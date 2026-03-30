import { Folder } from "lucide-react";
import { resetAndBrowseLibrary } from "@/actions/library";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function FileBrowserEmptyState() {
  return (
    <Empty
      className="h-full py-0"
      onDoubleClick={() => void resetAndBrowseLibrary()}
    >
      <EmptyMedia variant="icon">
        <Folder className="text-muted-foreground/60 size-6" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle className="text-base font-medium">
          No media loaded
        </EmptyTitle>
        <EmptyDescription className="text-xs">
          Browse your folders to add media files to the library.
        </EmptyDescription>
      </EmptyHeader>
      <Button
        className="mt-2 h-8 px-4 text-xs"
        onClick={resetAndBrowseLibrary}
        variant="outline"
      >
        Browse Files
      </Button>
    </Empty>
  );
}
