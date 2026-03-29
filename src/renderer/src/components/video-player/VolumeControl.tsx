import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MuteIcon, VolumeIcon } from "@/lib/icons";
import { useVolumeView, volumeCommands } from "@/lib/store";

export function VolumeControl() {
  const volume = useVolumeView();

  return (
    <div className="group/volume flex h-9 items-center overflow-hidden rounded-lg border border-white/10 bg-white/10 pr-1 text-white transition-colors hover:bg-white/15 focus-within:bg-white/15 sm:h-8">
      <Button
        className="size-8 shrink-0 border-0 bg-transparent p-0 text-white shadow-none hover:bg-transparent"
        onClick={() => volumeCommands.setMuted(!volume.isMuted)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {volume.isMuted || volume.value === 0 ? (
          <MuteIcon className="h-4 w-4" />
        ) : (
          <VolumeIcon className="h-4 w-4" />
        )}
      </Button>
      <div className="w-0 overflow-hidden opacity-0 pointer-events-none transition-[width,opacity] duration-200 ease-out group-hover/volume:w-32 group-hover/volume:opacity-100 group-hover/volume:pointer-events-auto group-focus-within/volume:w-32 group-focus-within/volume:opacity-100 group-focus-within/volume:pointer-events-auto pointer-coarse:w-32 pointer-coarse:opacity-100 pointer-coarse:pointer-events-auto">
        <div className="px-2">
          <Slider
            className="data-[orientation=horizontal]:w-full data-[orientation=horizontal]:min-w-0"
            max={1}
            min={0}
            onValueChange={(nextValue) => {
              const nextVolume = Array.isArray(nextValue) ? nextValue[0] : nextValue;
              volumeCommands.setVolume(nextVolume);
              if (nextVolume > 0) {
                volumeCommands.setMuted(false);
              }
            }}
            step={0.01}
            thumbAlignment="edge"
            value={[volume.value]}
          />
        </div>
      </div>
    </div>
  );
}
