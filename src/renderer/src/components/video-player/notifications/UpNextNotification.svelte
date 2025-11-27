<script lang="ts">
  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
  import { notificationSettings } from "$lib/state/notification-settings.svelte";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { cn } from "$lib/utils";
  import IconX from "lucide-svelte/icons/x";

  let isDismissed = $state(false);

  let showNotification = $derived.by(() => {
    if (!notificationSettings.upNextEnabled) return false;
    if (isDismissed) return false;
    if (!playerState.duration || !playerState.currentTime) return false;

    const remaining = playerState.duration - playerState.currentTime;
    const isNearEnd = remaining <= 10 && remaining > 0;
    const hasNext =
      queue.items.length > 0 &&
      (queue.index < queue.items.length - 1 || queue.repeatMode === "all");

    return isNearEnd && hasNext;
  });

  let remainingPercentage = $derived.by(() => {
    if (!playerState.duration || !playerState.currentTime) return 0;
    const remaining = playerState.duration - playerState.currentTime;
    return Math.max(0, Math.min(100, (remaining / 10) * 100));
  });

  $effect(() => {
    void playerState.currentVideo;
    isDismissed = false;
  });

  // Get next item info
  let nextItem = $derived.by(() => {
    if (queue.index < queue.items.length - 1) {
      return queue.items[queue.index + 1];
    } else if (queue.repeatMode === "all" && queue.items.length > 0) {
      return queue.items[0];
    }
    return null;
  });

  const positionClasses = {
    "top-left": "top-8 left-8",
    "top-right": "top-8 right-8",
    "bottom-left": "bottom-24 left-8",
    "bottom-right": "bottom-24 right-8"
  };

  function handleDismiss(e: MouseEvent): void {
    e.stopPropagation();
    isDismissed = true;
  }
</script>

{#if showNotification && nextItem}
  <div
    transition:fly={{ y: -20, duration: 400, easing: cubicOut }}
    class={cn(
      "bg-card/95 ring-border/50 hover:ring-border absolute z-50 flex max-w-sm flex-col gap-3 rounded-xl p-4 shadow-xl ring-1 backdrop-blur-md transition-all hover:shadow-2xl",
      positionClasses[notificationSettings.upNextPosition]
    )}
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-muted-foreground/80 text-[11px] font-semibold tracking-wider uppercase">
        Up Next
      </span>
      <button
        onclick={handleDismiss}
        class="text-muted-foreground/60 hover:text-foreground transition-colors"
        aria-label="Dismiss notification"
      >
        <IconX class="h-4 w-4" />
      </button>
    </div>

    <span class="line-clamp-2 text-base leading-tight font-semibold" title={nextItem.name}>
      {nextItem.name}
    </span>
    <div class="bg-muted/40 relative h-1 w-full overflow-hidden rounded-full">
      <div
        class="bg-primary/70 h-full rounded-full transition-all duration-300"
        style:width="{remainingPercentage}%"
      ></div>
    </div>

    <span class="text-muted-foreground/70 text-xs">
      Playing in {Math.ceil((playerState.duration || 0) - (playerState.currentTime || 0))}s
    </span>
  </div>
{/if}
