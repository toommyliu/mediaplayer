import { Repeat1, Repeat } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { queueCommands, useQueueView } from '@/lib/store'

export function RepeatButton() {
  const queue = useQueueView()

  return (
    <Tooltip>
      <TooltipTrigger
        closeOnClick={false}
        render={(props) => (
          <Button
            {...props}
            className={cn(
              queue.repeatMode === "off"
                ? "border-sidebar-border/60 h-7 px-2 text-xs"
                : "h-7 border-primary/20 bg-primary/5 px-2 text-xs text-primary hover:bg-primary/10",
              "transition-colors"
            )}
            onClick={() => queueCommands.toggleRepeatMode()}
            size="xs"
            type="button"
            variant={queue.repeatMode === "off" ? "outline" : "secondary"}
          >
            {queue.repeatMode === "one" ? (
              <Repeat1 className="size-3.5" />
            ) : (
              <Repeat className="size-3.5" />
            )}
          </Button>
        )}
      />
      <TooltipContent>
        <div className="w-16 text-center">
          {queue.repeatMode === "one"
            ? "Repeat one"
            : queue.repeatMode === "all"
              ? "Repeat all"
              : "Repeat off"}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}