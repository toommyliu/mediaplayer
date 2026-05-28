import type { ComponentProps } from "react";
import type { VideoMetadata } from "@/lib/contracts";
import { Info, Loader2 } from "lucide-react";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getVideoMetadata } from "@/lib/ipc";
import { makeTimeString } from "@/lib/make-time-string";
import { cn } from "@/lib/utils";
import { useCurrentQueueItem } from "@/stores/queue";

const controlItemClass = "h-9 border-0 bg-transparent px-3 text-white hover:bg-white/10 rounded-md shadow-none transition-all duration-300 active:scale-90 focus-visible:ring-1 focus-visible:ring-white/20 sm:h-8";

interface MetadataState {
  error: string | null;
  isLoading: boolean;
  loadedPath: string | null;
  metadata: VideoMetadata | null;
  open: boolean;
}

type MetadataAction = { type: "close" } | { type: "loadError" } | { metadata: VideoMetadata; path: string; type: "loadSuccess" } | { type: "resetForVideo" } | { type: "startLoading" } | { type: "toggleOpen" };

const initialMetadataState: MetadataState = {
  error: null,
  isLoading: false,
  loadedPath: null,
  metadata: null,
  open: false,
};

function metadataReducer(
  state: MetadataState,
  action: MetadataAction,
): MetadataState {
  switch (action.type) {
    case "close":
      return { ...state, open: false };
    case "loadError":
      return {
        ...state,
        error: "Metadata unavailable.",
        isLoading: false,
        metadata: null,
      };
    case "loadSuccess":
      return {
        ...state,
        error: null,
        isLoading: false,
        loadedPath: action.path,
        metadata: action.metadata,
      };
    case "resetForVideo":
      return initialMetadataState;
    case "startLoading":
      return { ...state, error: null, isLoading: true };
    case "toggleOpen":
      return { ...state, open: !state.open };
  }
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0)
    return "Unknown";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatBitrate(bitsPerSecond: number | undefined): string | null {
  if (!bitsPerSecond || !Number.isFinite(bitsPerSecond))
    return null;

  if (bitsPerSecond >= 1_000_000) {
    return `${(bitsPerSecond / 1_000_000).toFixed(2)} Mbps`;
  }

  return `${Math.round(bitsPerSecond / 1_000)} Kbps`;
}

function formatCodec(
  codecLongName: string | undefined,
  codecName: string | undefined,
): string | null {
  if (codecLongName && codecName && codecLongName !== codecName) {
    return `${codecLongName} (${codecName})`;
  }

  return codecLongName ?? codecName ?? null;
}

function formatAspectRatio(metadata: VideoMetadata): string | null {
  if (metadata.video?.displayAspectRatio)
    return metadata.video.displayAspectRatio;

  const width = metadata.video?.width;
  const height = metadata.video?.height;
  if (!width || !height)
    return null;

  const ratio = width / height;
  return Number.isFinite(ratio) ? ratio.toFixed(2) : null;
}

function formatAudioDetails(metadata: VideoMetadata): string | null {
  const codec = formatCodec(
    metadata.audio?.codecLongName,
    metadata.audio?.codecName,
  );
  if (!codec)
    return null;

  const details: string[] = [];
  if (metadata.audio?.channels)
    details.push(`${metadata.audio.channels} ch`);
  if (metadata.audio?.sampleRateHz)
    details.push(`${Math.round(metadata.audio.sampleRateHz / 1000)} kHz`);

  return details.length > 0 ? `${codec} · ${details.join(", ")}` : codec;
}

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value)
    return null;

  return (
    <div className="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] gap-3 text-xs">
      <dt className="text-white/45">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-white/88" title={value}>
        {value}
      </dd>
    </div>
  );
}

function VideoMetadataPanel({
  error,
  isLoading,
  metadata,
}: {
  error: string | null;
  isLoading: boolean;
  metadata: VideoMetadata | null;
}) {
  const rows = useMemo(() => {
    if (!metadata)
      return [];

    const resolution = metadata.video?.width && metadata.video?.height
      ? `${metadata.video.width} x ${metadata.video.height}`
      : null;
    const bitrate = formatBitrate(
      metadata.format?.bitrateBitsPerSecond
      ?? metadata.video?.bitrateBitsPerSecond,
    );
    const frameRate = metadata.video?.frameRate
      ? `${metadata.video.frameRate.toFixed(2)} fps`
      : null;

    return [
      { label: "File", value: metadata.file.name },
      { label: "Path", value: metadata.file.path },
      { label: "Size", value: formatBytes(metadata.file.sizeBytes) },
      {
        label: "Modified",
        value: new Date(metadata.file.modifiedAtMs).toLocaleString(),
      },
      {
        label: "Duration",
        value: metadata.format?.durationSeconds
          ? makeTimeString(metadata.format.durationSeconds)
          : null,
      },
      { label: "Resolution", value: resolution },
      { label: "Aspect ratio", value: formatAspectRatio(metadata) },
      {
        label: "Video",
        value: formatCodec(
          metadata.video?.codecLongName,
          metadata.video?.codecName,
        ),
      },
      { label: "Audio", value: formatAudioDetails(metadata) },
      { label: "Bitrate", value: bitrate },
      { label: "Frame rate", value: frameRate },
    ];
  }, [metadata]);

  const panel = (
    <div
      className={cn(
        "pointer-events-none absolute top-6 right-6 z-40 w-[min(28rem,calc(100%_-_3rem))] text-white",
        "animate-in fade-in-0 slide-in-from-top-2 duration-150",
      )}
    >
      <div className="overflow-hidden rounded-md border border-white/10 bg-black/45 shadow-2xl shadow-black/45 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <div className="text-[0.625rem] font-semibold tracking-[0.18em] text-white/72 uppercase">
            Metadata
          </div>
          {metadata?.file.extension
            ? (
                <div className="rounded border border-white/10 bg-white/8 px-1.5 py-0.5 text-[0.625rem] font-medium text-white/70 uppercase">
                  {metadata.file.extension}
                </div>
              )
            : null}
        </div>

        <div className="max-h-[min(22rem,calc(100vh-10rem))] overflow-hidden px-3 py-2.5">
          {isLoading
            ? (
                <div className="flex items-center gap-2 py-3 text-xs text-white/70">
                  <Loader2 className="size-3.5 animate-spin" />
                  Reading file...
                </div>
              )
            : null}

          {!isLoading && error
            ? (
                <div className="text-xs text-white/75">
                  Metadata unavailable
                </div>
              )
            : null}

          {!isLoading && metadata
            ? (
                <dl className="space-y-2">
                  {metadata.probeError
                    ? (
                        <div className="border-l border-white/20 pl-2 text-[0.6875rem] text-white/62">
                          Partial technical data
                        </div>
                      )
                    : null}
                  {rows.map(row => (
                    <MetadataRow
                      key={row.label}
                      label={row.label}
                      value={row.value}
                    />
                  ))}
                </dl>
              )
            : null}
        </div>
      </div>
    </div>
  );

  const container = document.getElementById("video-container");
  return container ? createPortal(panel, container) : panel;
}

export function VideoMetadataButton() {
  const currentItem = useCurrentQueueItem();
  const [state, dispatch] = useReducer(
    metadataReducer,
    initialMetadataState,
  );
  const requestIdRef = useRef(0);

  useEffect(() => {
    dispatch({ type: "resetForVideo" });
    requestIdRef.current += 1;
  }, [currentItem?.id]);

  useEffect(() => {
    if (!state.open || !currentItem)
      return;

    if (state.loadedPath === currentItem.path && state.metadata)
      return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    dispatch({ type: "startLoading" });

    void getVideoMetadata(currentItem.path)
      .then((result) => {
        if (requestIdRef.current !== requestId)
          return;

        dispatch({
          metadata: result,
          path: currentItem.path,
          type: "loadSuccess",
        });
      })
      .catch(() => {
        if (requestIdRef.current !== requestId)
          return;

        dispatch({ type: "loadError" });
      });
  }, [currentItem, state.loadedPath, state.metadata, state.open]);

  useEffect(() => {
    if (!state.open)
      return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dispatch({ type: "close" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.open]);

  if (!currentItem)
    return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={(props: ComponentProps<"button">) => {
            return (
              <Button
                {...props}
                aria-expanded={state.open}
                aria-label="Show video metadata"
                className={cn(controlItemClass, props.className)}
                onClick={(event) => {
                  props.onClick?.(event);
                  dispatch({ type: "toggleOpen" });
                }}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Info className="size-4" />
              </Button>
            );
          }}
        />
        <TooltipContent>
          <p>Video metadata</p>
        </TooltipContent>
      </Tooltip>

      {state.open
        ? (
            <VideoMetadataPanel
              error={state.error}
              isLoading={state.isLoading}
              metadata={state.metadata}
            />
          )
        : null}
    </>
  );
}
