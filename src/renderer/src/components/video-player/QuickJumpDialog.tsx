import type { KeyboardEvent } from "react";
import type { QueueItem } from "@/types";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { playVideo } from "@/actions/playback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { makeTimeString } from "@/lib/make-time-string";
import { cn } from "@/lib/utils";
import { useCurrentQueueItem, useQueueStore } from "@/stores/queue";

const PATH_SEPARATOR_REGEX = /[\\/]/;

interface QuickJumpDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

interface QuickJumpResult {
  index: number;
  item: QueueItem;
}

function getContainingFolder(path: string): string {
  const parts = path.split(PATH_SEPARATOR_REGEX).filter(Boolean);
  return parts.length > 1 ? parts.at(-2)! : "";
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function QuickJumpDialog({ onOpenChange, open }: QuickJumpDialogProps) {
  const currentItem = useCurrentQueueItem();
  const queueIndex = useQueueStore((state) => state.index);
  const queueItems = useQueueStore((state) => state.items);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const results = useMemo<QuickJumpResult[]>(() => {
    const entries = queueItems.map((item, index) => ({ index, item }));
    const normalizedQuery = normalizeSearchValue(query);

    if (normalizedQuery) {
      return entries.filter(({ item }) => {
        return `${item.name} ${item.path}`.toLowerCase().includes(normalizedQuery);
      });
    }

    return [...entries.slice(queueIndex + 1), ...entries.slice(0, queueIndex + 1)];
  }, [query, queueIndex, queueItems]);

  const safeActiveIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

  useEffect(() => {
    resultButtonsRef.current[safeActiveIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [safeActiveIndex]);

  function selectResult(result: QuickJumpResult | undefined): void {
    if (!result) return;

    onOpenChange(false);
    if (result.item.id !== currentItem?.id) {
      playVideo(result.item.path);
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onOpenChange(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex(results.length === 0 ? 0 : (safeActiveIndex + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex(
        results.length === 0 ? 0 : (safeActiveIndex - 1 + results.length) % results.length,
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex(Math.max(0, results.length - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      selectResult(results[safeActiveIndex]);
      return;
    }

    event.stopPropagation();
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[min(34rem,calc(100vh-2rem))] max-w-2xl overflow-hidden p-0"
        onKeyDown={handleKeyDown}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Jump to video</DialogTitle>
        <DialogDescription className="sr-only">
          Search the queue and jump directly to a video.
        </DialogDescription>

        <div className="border-b p-3">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
            <Input
              ref={inputRef}
              autoFocus
              className="bg-muted/40 h-10 rounded-lg pr-9 pl-9 text-sm shadow-none"
              nativeInput
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search queue..."
              type="search"
              value={query}
            />
            {query ? (
              <Button
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 z-10 size-6 -translate-y-1/2 rounded-md"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(0);
                  inputRef.current?.focus();
                }}
                size="icon-xs"
                variant="ghost"
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center px-4 text-center text-sm">
              No videos found
            </div>
          ) : (
            results.map((result, resultIndex) => {
              const isActive = resultIndex === safeActiveIndex;
              const isCurrent = result.item.id === currentItem?.id;
              const folder = getContainingFolder(result.item.path);

              return (
                <button
                  aria-current={isCurrent ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none transition-colors",
                    isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/70",
                  )}
                  key={result.item.id}
                  onClick={() => selectResult(result)}
                  onMouseEnter={() => setActiveIndex(resultIndex)}
                  ref={(element) => {
                    resultButtonsRef.current[resultIndex] = element;
                  }}
                  type="button"
                >
                  <span className="text-muted-foreground/70 w-8 shrink-0 text-right text-xs font-medium tabular-nums">
                    {result.index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate leading-tight font-medium">
                      {result.item.name}
                    </span>
                    <span className="text-muted-foreground/72 mt-1 flex min-w-0 items-center gap-2 text-xs">
                      {folder ? <span className="truncate">{folder}</span> : null}
                      {result.item.duration ? (
                        <span className="shrink-0 tabular-nums">
                          {makeTimeString(result.item.duration)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {isCurrent ? (
                    <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium">
                      Now
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="text-muted-foreground flex items-center justify-between gap-3 border-t px-4 py-3 text-xs">
          <span>{query ? "Search results" : "Up next first"}</span>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd>Enter</Kbd>
              Jump
            </span>
            <span className="flex items-center gap-1">
              <KbdGroup>
                <Kbd>Esc</Kbd>
              </KbdGroup>
              Close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
