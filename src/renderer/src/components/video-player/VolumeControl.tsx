import { VolumeX, Volume, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button";
import { useVolumeView, volumeCommands } from "@/lib/store";

function VolumeSlider({
  value,
  isMuted,
  onChange,
}: {
  value: number;
  isMuted: boolean;
  onChange: (v: number) => void;
}) {
  const fillPercent = value * 100;
  const fillColor = isMuted ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.9)";
  const trackColor = "rgba(255,255,255,0.15)";

  return (
    <div className="relative flex h-full w-full items-center">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="volume-slider w-full cursor-pointer appearance-none bg-transparent outline-none"
        style={
          {
            "--fill": fillColor,
            "--track": trackColor,
            "--pct": `${fillPercent}%`,
          } as React.CSSProperties
        }
      />
      <style>{`
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
      `}</style>
    </div>
  );
}

export function VolumeControl() {
  const volume = useVolumeView();

  return (
    <div className="flex h-9 items-center rounded-lg border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15 focus-within:bg-white/15 sm:h-8">
      <Button
        className="size-8 shrink-0 border-0 bg-transparent p-0 text-white shadow-none hover:bg-white/10"
        onClick={() => volumeCommands.setMuted(!volume.isMuted)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {volume.isMuted || volume.value === 0 ? (
          <VolumeX className="h-4 w-4" />
        ) : volume.value < 0.5 ? (
          <Volume className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      <div className="group/volume flex h-full items-center">
        <div className="mx-1.5 h-3 w-1 rounded-full bg-white/20 transition-all group-hover/volume:opacity-0 group-focus-within/volume:opacity-0" />

        <div className="w-0 overflow-hidden opacity-0 pointer-events-none transition-[width,opacity] duration-200 ease-out group-hover/volume:w-28 group-hover/volume:opacity-100 group-hover/volume:pointer-events-auto group-focus-within/volume:w-28 group-focus-within/volume:opacity-100 group-focus-within/volume:pointer-events-auto">
          <div className="flex h-full w-28 items-center px-2">
            <VolumeSlider
              value={volume.value}
              isMuted={volume.isMuted}
              onChange={(nextVolume) => {
                volumeCommands.setVolume(nextVolume);
                if (nextVolume > 0) {
                  volumeCommands.setMuted(false);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
