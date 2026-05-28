import { PictureInPicture, PictureInPicture2 } from "lucide-react";
import * as React from "react";
import { togglePictureInPicture } from "@/actions/playback";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player";

const controlItemClass
  = "h-9 border-0 bg-transparent px-3 text-white hover:bg-white/10 rounded-md shadow-none transition-all duration-300 active:scale-90 focus-visible:ring-1 focus-visible:ring-white/20 sm:h-8";

function PictureInPictureControlButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const isPictureInPicture = usePlayerStore(state => state.isPictureInPicture);
  const isPictureInPictureSupported = usePlayerStore(
    state => state.isPictureInPictureSupported,
  );

  const label = isPictureInPicture
    ? "Exit picture in picture"
    : "Enter picture in picture";

  return (
    <Button
      {...props}
      aria-label={label}
      aria-pressed={isPictureInPicture}
      className={cn(controlItemClass, className)}
      disabled={!isPictureInPictureSupported}
      onClick={() => {
        void togglePictureInPicture();
      }}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      {isPictureInPicture
        ? (
            <PictureInPicture2 className="size-4" />
          )
        : (
            <PictureInPicture className="size-4" />
          )}
    </Button>
  );
}

export function PictureInPictureButton() {
  const isPictureInPicture = usePlayerStore(state => state.isPictureInPicture);
  const isPictureInPictureSupported = usePlayerStore(
    state => state.isPictureInPictureSupported,
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => {
          return <PictureInPictureControlButton {...props} />;
        }}
      />
      <TooltipContent>
        <p>
          {isPictureInPictureSupported
            ? isPictureInPicture
              ? "Exit picture in picture"
              : "Enter picture in picture"
            : "Picture in picture unavailable"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
