<script lang="ts">
  import IconMusic from "lucide-svelte/icons/music";
  import IconRepeat from "lucide-svelte/icons/repeat";
  import IconRepeat1 from "lucide-svelte/icons/repeat-1";
  import IconShuffle from "lucide-svelte/icons/shuffle";
  import IconX from "lucide-svelte/icons/x";
  import { draggable, droppable, type DragDropState } from "@thisux/sveltednd";
  import { flip } from "svelte/animate";
  import type { QueueItem } from "$lib/state/queue.svelte";
  import { ICON_SIZE } from "$lib/constants";
  import { makeTimeString } from "$lib/makeTimeString";
  import { QueueManager } from "$lib/queue-manager";
  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
  import { cn } from "$lib/utils";

  function isCurrentlyPlaying(item: QueueItem): boolean {
    return queue?.currentItem?.path === item.path;
  }

  function handleItemClick(item: QueueItem) {
    playerState.playVideo(item!.path!);
  }

  function removeFromQueue(itemId: string) {
    const itemToRemove = queue.items.find((item) => item.id === itemId);

    if (itemToRemove && isCurrentlyPlaying(itemToRemove)) {
      const currentIndex = queue.items.findIndex((item) => item.id === itemId);
      const queueLength = queue.items.length;

      let nextVideoToPlay: string | null = null;

      if (queueLength > 1) {
        if (currentIndex < queueLength - 1) {
          const nextItem = queue.items[currentIndex + 1];
          nextVideoToPlay = nextItem.path;
        } else if (currentIndex > 0) {
          const prevItem = queue.items[currentIndex - 1];
          nextVideoToPlay = `file://${prevItem.path}`;
        }
      }

      QueueManager.removeFromQueue(itemId);

      if (nextVideoToPlay) {
        playerState.playVideo(nextVideoToPlay);
      } else if (playerState.videoElement) {
        playerState.videoElement.pause();
        playerState.isPlaying = false;
        playerState.currentTime = 0;
      }
    } else {
      QueueManager.removeFromQueue(itemId);
    }
  }

  function handleDrop(state: DragDropState<QueueItem>) {
    const { draggedItem, targetContainer } = state;
    const dragIndex = queue.items.findIndex((item) => item.id === draggedItem.id);
    const dropIndex = parseInt(targetContainer ?? "0");

    if (dragIndex !== -1 && !isNaN(dropIndex) && dragIndex !== dropIndex) {
      QueueManager.moveItem(dragIndex, dropIndex);
    }
  }

  function shuffleQueue() {
    QueueManager.shuffleQueue();
  }

  function toggleRepeat() {
    QueueManager.toggleRepeatMode();
  }

  function getRepeatIcon() {
    switch (queue.repeatMode) {
      case "one":
        return IconRepeat1;
      case "all":
        return IconRepeat;
      case "off":
        return IconRepeat;
      default:
        return IconRepeat;
    }
  }
</script>

<div class="flex h-full flex-col">
  <!-- Queue Items -->
  <div class="no-scrollbar flex-1 overflow-y-auto">
    {#if queue.items.length === 0}
      <div class="flex h-full items-center justify-center">
        <div class="text-muted-foreground text-center">
          <IconMusic size={32} class="mx-auto mb-2 opacity-50" />
          <p class="text-sm font-medium">No videos in queue</p>
          <p class="text-xs opacity-75">Open a folder to add videos</p>
        </div>
      </div>
    {:else}
      <div class="space-y-1">
        {#each queue.items as item, index (item.id)}
          <div
            use:draggable={{ container: index.toString(), dragData: item, interactive: ["button"] }}
            use:droppable={{ container: index.toString(), callbacks: { onDrop: handleDrop } }}
            animate:flip={{ duration: 200 }}
            class={cn(
              "group flex cursor-grab items-center gap-2 rounded-md p-2 text-sm transition-colors active:cursor-grabbing",
              isCurrentlyPlaying(item)
                ? "bg-blue-500/20 text-blue-400"
                : "text-muted-foreground hover:bg-muted/50"
            )}
            role="button"
            tabindex="0"
            onclick={() => handleItemClick(item)}
            onkeydown={(ev) => ev.key === "Enter" && handleItemClick(item)}
          >
            <div class="flex h-5 w-5 shrink-0 items-center justify-center">
              <span class="text-muted-foreground text-xs">{index + 1}</span>
            </div>

            <!-- Video Info -->
            <div class="min-w-0 flex-1">
              <div class="text-muted-foreground font-medium">
                {item.name ?? "Unknown Video"}
              </div>
              {#if item.duration}
                <div class="text-muted-foreground text-xs">
                  {makeTimeString(item.duration)}
                </div>
              {/if}
            </div>

            <!-- Actions -->
            <div
              class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <button
                class="text-muted-foreground hover:bg-muted/70 hover:text-destructive flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-colors"
                onclick={(ev) => {
                  ev.stopPropagation();
                  removeFromQueue(item.id);
                }}
              >
                <IconX size={ICON_SIZE - 6} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Footer with shuffle and repeat controls -->
  <div class="border-sidebar-border mt-4 border-t p-1 pb-0">
    <div class="flex items-center justify-center gap-2">
      <button
        class="text-muted-foreground hover:bg-muted/60 hover:text-muted-foreground flex h-8 w-8 items-center justify-center rounded transition-colors"
        onclick={shuffleQueue}
      >
        <IconShuffle size={ICON_SIZE - 4} />
      </button>

      <button
        class={cn(
          "flex h-8 w-8 items-center justify-center rounded transition-colors",
          queue.repeatMode === "off"
            ? "text-muted-foreground hover:bg-muted/60 hover:text-muted-foreground"
            : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
        )}
        onclick={toggleRepeat}
      >
        <svelte:component this={getRepeatIcon()} size={ICON_SIZE - 4} />
      </button>
    </div>
  </div>
</div>

<style>
  :global(.dragging) {
    opacity: 0.5;
    transform: rotate(2deg);
    cursor: grabbing;
  }
  :global(.drag-over) {
    background-color: rgba(59, 130, 246, 0.1);
    cursor: grabbing;
  }
</style>
