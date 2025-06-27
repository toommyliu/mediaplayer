<script lang="ts">
  import IconArrowDown from "lucide-svelte/icons/arrow-down";
  import IconArrowUp from "lucide-svelte/icons/arrow-up";
  import IconMusic from "lucide-svelte/icons/music";
  import IconX from "lucide-svelte/icons/x";
  import { ICON_SIZE } from "@/constants";
  import { playerState } from "@/state.svelte";
  import { makeTimeString } from "@/utils/makeTimeString";
  import { QueueManager } from "@/utils/queue-manager";
  import { cn } from "@/utils/utils";
  import { playVideo } from "@/utils/video-playback";

  function isCurrentlyPlaying(item: any): boolean {
    if (!playerState.currentVideo) return false;
    return playerState.currentVideo === `file://${item.path}`;
  }

  function handleItemClick(item: any) {
    const videoSrc = `file://${item.path}`;
    playVideo(videoSrc);
  }

  function removeFromQueue(itemId: string) {
    const itemToRemove = playerState.queue.find((item) => item.id === itemId);

    // The current video is being removed
    if (itemToRemove && isCurrentlyPlaying(itemToRemove)) {
      const currentIndex = playerState.queue.findIndex((item) => item.id === itemId);
      const queueLength = playerState.queue.length;

      let nextVideoToPlay: string | null = null;

      if (queueLength > 1) {
        // Determine the next video to play after removal
        if (currentIndex < queueLength - 1) {
          const nextItem = playerState.queue[currentIndex + 1];
          nextVideoToPlay = `file://${nextItem.path}`;
        } else if (currentIndex > 0) {
          const prevItem = playerState.queue[currentIndex - 1];
          nextVideoToPlay = `file://${prevItem.path}`;
        }
      }

      QueueManager.removeFromQueue(itemId);

      if (nextVideoToPlay) {
        playVideo(nextVideoToPlay);
      } else if (playerState.videoElement) {
        playerState.videoElement.pause();
        playerState.isPlaying = false;
        playerState.currentTime = 0;
      }
    } else {
      QueueManager.removeFromQueue(itemId);
    }
  }

  function moveItemUp(index: number) {
    if (index > 0) {
      QueueManager.moveItem(index, index - 1);
    }
  }

  function moveItemDown(index: number) {
    if (index < playerState.queue.length - 1) {
      QueueManager.moveItem(index, index + 1);
    }
  }

  function confirmClearQueue() {
    QueueManager.clearQueue();
    showClearDialog = false;
  }
</script>

<div class="flex h-full flex-col">
  <!-- Queue Items -->
  <div class="no-scrollbar flex-1 overflow-y-auto">
    {#if playerState.queue.length === 0}
      <div class="flex h-full items-center justify-center">
        <div class="text-center text-zinc-500">
          <IconMusic size={32} class="mx-auto mb-2 opacity-50" />
          <p class="text-sm font-medium">No videos in queue</p>
          <p class="text-xs opacity-75">Open a folder to add videos</p>
        </div>
      </div>
    {:else}
      <div class="space-y-1">
        {#each playerState.queue as item, index (item.id)}
          <div
            class={cn(
              "group flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm transition-colors",
              isCurrentlyPlaying(item)
                ? "bg-blue-500/20 text-blue-400"
                : "text-zinc-200 hover:bg-zinc-800/50"
            )}
            role="button"
            tabindex="0"
            onclick={() => handleItemClick(item)}
            onkeydown={(ev) => ev.key === "Enter" && handleItemClick(item)}
          >
            <div class="flex h-5 w-5 shrink-0 items-center justify-center">
              <span class="text-xs text-zinc-500">{index + 1}</span>
            </div>

            <!-- Video Info -->
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium text-zinc-200">
                {item.name ?? "Unknown Video"}
              </div>
              {#if item.duration}
                <div class="text-xs text-zinc-500">
                  {makeTimeString(item.duration)}
                </div>
              {/if}
            </div>

            <!-- Actions -->
            <div
              class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
                title="Move up"
                onclick={(ev) => {
                  ev.stopPropagation();
                  moveItemUp(index);
                }}
                disabled={index === 0}
              >
                <IconArrowUp size={ICON_SIZE - 6} />
              </button>
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
                title="Move down"
                onclick={(ev) => {
                  ev.stopPropagation();
                  moveItemDown(index);
                }}
                disabled={index === playerState.queue.length - 1}
              >
                <IconArrowDown size={ICON_SIZE - 6} />
              </button>
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-red-400"
                title="Remove from queue"
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
</div>
