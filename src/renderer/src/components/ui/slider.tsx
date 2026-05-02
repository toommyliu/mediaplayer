"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { makeTimeString } from "@/lib/make-time-string";
import { cn } from "@/lib/utils";

export interface SliderProps extends SliderPrimitive.Root.Props {
  indicatorClassName?: string;
  markers?: { timestamp: number; label?: string }[];
  thumbClassName?: string;
  trackClassName?: string;
}

export function Slider({
  className,
  trackClassName,
  indicatorClassName,
  thumbClassName,
  children,
  defaultValue,
  value,
  min = 0,
  max = 100,
  markers,
  ...props
}: SliderProps): React.ReactElement {
  const _values = React.useMemo(() => {
    if (value !== undefined) {
      return Array.isArray(value) ? value : [value];
    }
    if (defaultValue !== undefined) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [min];
  }, [value, defaultValue, min]);

  return (
    <SliderPrimitive.Root
      className={cn("group/slider relative data-[orientation=horizontal]:w-full", className)}
      defaultValue={defaultValue}
      max={max}
      min={min}
      thumbAlignment="edge"
      value={value}
      {...props}
    >
      {children}
      <SliderPrimitive.Control
        className="flex touch-none select-none py-3 data-disabled:pointer-events-none data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:flex-col data-disabled:opacity-64"
        data-slot="slider-control"
      >
        <SliderPrimitive.Track
          className={cn(
            "relative grow select-none before:absolute before:rounded-full before:bg-input data-[orientation=horizontal]:h-1 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1 data-[orientation=horizontal]:before:inset-x-0.5 data-[orientation=vertical]:before:inset-x-0 data-[orientation=horizontal]:before:inset-y-0 data-[orientation=vertical]:before:inset-y-0.5",
            trackClassName,
          )}
          data-slot="slider-track"
        >
          <SliderPrimitive.Indicator
            className={cn(
              "select-none rounded-full bg-primary data-[orientation=horizontal]:ms-0.5 data-[orientation=vertical]:mb-0.5",
              indicatorClassName,
            )}
            data-slot="slider-indicator"
          />
          {markers?.map((marker, index) => {
            const timestamp
              = typeof marker === "number" ? marker : marker.timestamp;
            const _label = typeof marker === "number" ? undefined : marker.label;
            const label = _label || `Bookmark ${index + 1}`;

            if (
              max <= min
              || timestamp < min
              || timestamp > max
              || !Number.isFinite(timestamp)
            ) {
              return null;
            }

            const position = Math.min(
              100,
              Math.max(0, ((timestamp - min) / (max - min)) * 100),
            );
            const isPassed = timestamp <= _values[0];

            return (
              <Tooltip key={timestamp}>
                <TooltipTrigger render={props => (
                  <div
                    className="group/marker absolute top-1/2 z-10 h-6 w-4 -translate-x-1/2 -translate-y-1/2 cursor-default"
                    style={{ left: `${position}%` }}
                    {...props}
                  >
                    <div
                      className={cn(
                        "absolute top-1/2 left-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[height,width,background-color,box-shadow] duration-300 ease-in-out before:absolute before:top-0 before:left-1/2 before:h-1.5 before:w-2 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:transition-colors before:duration-300 group-hover/marker:h-5 group-hover/marker:w-1.5 group-hover/marker:bg-white group-focus-visible/marker:h-5 group-focus-visible/marker:w-1.5 group-focus-visible/marker:bg-white",
                        isPassed
                          ? "bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_1px_5px_rgba(0,0,0,0.55),0_0_8px_rgba(255,255,255,0.18)] before:bg-white group-hover/marker:shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_2px_7px_rgba(0,0,0,0.65),0_0_10px_rgba(255,255,255,0.28)] group-focus-visible/marker:shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_2px_7px_rgba(0,0,0,0.65),0_0_10px_rgba(255,255,255,0.28)]"
                          : "bg-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.55),0_1px_4px_rgba(0,0,0,0.7)] before:bg-white/80 group-hover/marker:shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_2px_7px_rgba(0,0,0,0.7),0_0_9px_rgba(255,255,255,0.2)] group-focus-visible/marker:shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_2px_7px_rgba(0,0,0,0.7),0_0_9px_rgba(255,255,255,0.2)]",
                      )}
                    >
                    </div>
                  </div>
                )}
                />
                <TooltipContent side="top" sideOffset={12}>
                  <div className="flex flex-col gap-0.5 px-1 py-0.5">
                    <span className="font-medium text-[12px]">{label}</span>
                    <span className="text-muted-foreground tabular-nums text-[10px]">
                      {makeTimeString(timestamp)}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {Array.from({ length: _values.length }, (_, index) => (
            <SliderPrimitive.Thumb
              className={cn(
                "block size-5 shrink-0 select-none rounded-full border border-input bg-white not-dark:bg-clip-padding shadow-xs/5 outline-none transition-[box-shadow,scale] before:absolute before:inset-0 before:rounded-full before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 data-dragging:scale-120 sm:size-4 dark:border-background dark:has-focus-visible:ring-ring/48 [:has(*:focus-visible),[data-dragging]]:shadow-none",
                thumbClassName,
              )}
              data-slot="slider-thumb"
              index={index}
              key={String(index)}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export function SliderValue({
  className,
  ...props
}: SliderPrimitive.Value.Props): React.ReactElement {
  return (
    <SliderPrimitive.Value
      className={cn("flex justify-end text-sm", className)}
      data-slot="slider-value"
      {...props}
    />
  );
}

export { SliderPrimitive };
