import { Volume, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useVolumeStore } from "@/stores/volume";

function VolumeSlider({
  value,
  isMuted,
  onChange,
}: {
  value: number;
  isMuted: boolean;
  onChange: (v: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fillPercent = value * 100;
  const fillColor = isMuted
    ? "rgba(255,255,255,0.25)"
    : "rgba(255,255,255,0.9)";
  const trackColor = "rgba(255,255,255,0.15)";

  return (
    <div className="relative flex h-full w-full items-center">
      <Tooltip open={isDragging}>
        <TooltipTrigger
          render={props => (
            <input
              {...props}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={value}
              onChange={e => onChange(Number.parseFloat(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="volume-slider w-full cursor-pointer appearance-none bg-transparent outline-none"
              style={
                {
                  "--fill": fillColor,
                  "--track": trackColor,
                  "--pct": `${fillPercent}%`,
                } as React.CSSProperties
              }
            />
          )}
        />
        <TooltipContent side="top" sideOffset={12}>
          {Math.round(value * 100)}
          %
        </TooltipContent>
      </Tooltip>

      <style>
        {`
        .volume-slider {
          height: 16px;
          -webkit-tap-highlight-color: transparent;
        }
        /* Track */
        .volume-slider::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            var(--fill) 0%,
            var(--fill) var(--pct),
            var(--track) var(--pct),
            var(--track) 100%
          );
          transition: background 0.15s ease;
          border: none;
        }
        .volume-slider::-moz-range-track {
          height: 4px;
          border-radius: 9999px;
          background: var(--track);
          border: none;
        }
        .volume-slider::-moz-range-progress {
          height: 4px;
          border-radius: 9999px;
          background: var(--fill);
          transition: background 0.15s ease;
        }
        /* Thumb */
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid rgba(255,255,255,0.8);
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.2);
          margin-top: -4px;
          cursor: pointer;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        .volume-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid rgba(255,255,255,0.8);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        /* Hover / focus states */
        .volume-slider:hover::-webkit-slider-thumb {
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          transform: scale(1.25);
        }
        .volume-slider:focus-visible::-webkit-slider-thumb {
          box-shadow: 
            0 0 0 2px #000,
            0 0 0 4px #fff;
          transform: scale(1.25);
        }
        .volume-slider:hover::-moz-range-thumb {
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          transform: scale(1.25);
        }
        .volume-slider:focus-visible::-moz-range-thumb {
          box-shadow: 
            0 0 0 2px #000,
            0 0 0 4px #fff;
          transform: scale(1.25);
        }
      `}
      </style>
    </div>
  );
}

export function VolumeControl() {
  const setVolume = useVolumeStore(state => state.setVolume);
  const setMuted = useVolumeStore(state => state.setMuted);
  const isMuted = useVolumeStore(state => state.isMuted);
  const value = useVolumeStore(state => state.value);

  return (
    <div className="group/volume flex h-9 items-center text-white sm:h-8">
      <Tooltip>
        <TooltipTrigger
          render={props => (
            <Button
              {...props}
              className="size-9 shrink-0 rounded-md border-0 bg-transparent p-0 text-white shadow-none transition-all hover:bg-white/10 active:scale-95 sm:size-8"
              onClick={() => setMuted(!isMuted)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {isMuted || value === 0
                ? (
                    <VolumeX className="h-4 w-4" />
                  )
                : value < 0.5
                  ? (
                      <Volume className="h-4 w-4" />
                    )
                  : (
                      <Volume2 className="h-4 w-4" />
                    )}
            </Button>
          )}
        />
        <TooltipContent side="top" sideOffset={8}>
          {isMuted ? "Unmute" : "Mute"}
          {" "}
          (
          {Math.round(value * 100)}
          %)
        </TooltipContent>
      </Tooltip>

      <div className="flex h-full items-center">
        <div className="pointer-events-none w-0 overflow-hidden opacity-0 transition-all duration-300 ease-out group-focus-within/volume:pointer-events-auto group-focus-within/volume:w-28 group-focus-within/volume:opacity-100 group-hover/volume:pointer-events-auto group-hover/volume:w-28 group-hover/volume:opacity-100">
          <div className="flex h-full w-28 items-center pr-2 pl-2">
            <VolumeSlider
              value={value}
              isMuted={isMuted}
              onChange={(nextVolume) => {
                setVolume(nextVolume);
                if (nextVolume > 0) {
                  setMuted(false);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
