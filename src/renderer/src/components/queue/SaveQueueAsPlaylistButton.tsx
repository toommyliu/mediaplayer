import { SaveIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlaylistsStore } from "@/stores/playlists";
import { useQueueStore } from "@/stores/queue";
import { PlaylistNameDialog } from "./PlaylistNameDialog";

const PLAYLIST_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

function formatPlaylistDate(timestamp: number): string {
  return PLAYLIST_DATE_FORMATTER.format(new Date(timestamp));
}

function makeDefaultQueuePlaylistName(): string {
  return `Queue ${formatPlaylistDate(Date.now())}`;
}

export function SaveQueueAsPlaylistButton() {
  const queueItems = useQueueStore(state => state.items);
  const createPlaylist = usePlaylistsStore(state => state.createPlaylist);
  const [isOpen, setIsOpen] = useState(false);
  const canSaveQueue = queueItems.length > 0;

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={(
            <Button
              className="h-7 px-2 text-xs"
              disabled={!canSaveQueue}
              onClick={() => setIsOpen(true)}
              size="xs"
              type="button"
              variant="outline"
            >
              <SaveIcon className="size-3.5" />
              Save as playlist
            </Button>
          )}
        />
        <TooltipContent>
          {canSaveQueue ? "Save queue as playlist" : "Queue is empty"}
        </TooltipContent>
      </Tooltip>

      {isOpen
        ? (
            <PlaylistNameDialog
              defaultName={makeDefaultQueuePlaylistName()}
              description="Save the current queue order as a reusable playlist."
              onOpenChange={setIsOpen}
              onSubmit={name => createPlaylist(name, queueItems)}
              open={isOpen}
              submitLabel="Save"
              title="Save Queue as Playlist"
            />
          )
        : null}
    </>
  );
}
