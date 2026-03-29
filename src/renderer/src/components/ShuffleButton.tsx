import { Shuffle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { queueCommands } from '@/lib/store'
import { cn } from '@/lib/utils'

export function ShuffleButton() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Button
            {...props}
            className={cn("h-7 px-2 text-xs border-sidebar-border/60")}
            onClick={() => queueCommands.shuffleQueue()}
            size="xs"
            type="button"
            variant="outline"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
        )}
      />
      <TooltipContent>
        Shuffle
      </TooltipContent>
    </Tooltip>
  )
}