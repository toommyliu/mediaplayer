import { BookmarkIcon } from "lucide-react";

export function BookmarksEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <div className="bg-primary/5 mb-2 flex size-8 items-center justify-center rounded-full">
        <BookmarkIcon className="text-primary size-4 opacity-40" />
      </div>
      <h3 className="mb-0.5 text-xs font-medium">No bookmarks yet</h3>
      <p className="text-muted-foreground/60 text-[0.625rem] leading-relaxed">
        Press <span className="text-foreground/80 font-mono">B</span> or use the bookmark button to save a moment.
      </p>
    </div>
  );
}
