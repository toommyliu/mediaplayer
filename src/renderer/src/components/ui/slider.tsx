"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
      className={cn("data-[orientation=horizontal]:w-full", className)}
      defaultValue={defaultValue}
      max={max}
      min={min}
      thumbAlignment="edge"
      value={value}
      {...props}
    >
      {children}
      <SliderPrimitive.Control
        className="flex touch-none select-none data-disabled:pointer-events-none data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:flex-col data-disabled:opacity-64"
        data-slot="slider-control"
      >
        <SliderPrimitive.Track
          className={cn(
            "relative grow select-none before:absolute before:rounded-full before:bg-input data-[orientation=horizontal]:h-1 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1 data-[orientation=horizontal]:before:inset-x-0.5 data-[orientation=vertical]:before:inset-x-0 data-[orientation=horizontal]:before:inset-y-0 data-[orientation=vertical]:before:inset-y-0.5",
            trackClassName,
          )}
          data-slot="slider-track"
        >
          <TooltipProvider>
            {markers?.map((marker) => {
              const timestamp =
                typeof marker === "number" ? marker : marker.timestamp;
              const label = typeof marker === "number" ? undefined : marker.label;
              const position = ((timestamp - min) / (max - min)) * 100;

              return (
                <Tooltip key={timestamp}>
                  <TooltipTrigger
                    className="absolute top-1/2 z-10 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_3px_rgba(0,0,0,0.8)] outline-none transition-transform hover:scale-y-150 hover:bg-primary"
                    style={{ left: `${position}%` }}
                  />
                  <TooltipContent side="top" sideOffset={8}>
                    <div className="flex flex-col gap-0.5 px-1 py-0.5">
                      {label && <span className="font-medium">{label}</span>}
                      <span className="text-muted-foreground tabular-nums">
                        {makeTimeString(timestamp)}
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
          <SliderPrimitive.Indicator
            className={cn(
              "select-none rounded-full bg-primary data-[orientation=horizontal]:ms-0.5 data-[orientation=vertical]:mb-0.5",
              indicatorClassName,
            )}
            data-slot="slider-indicator"
          />
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
