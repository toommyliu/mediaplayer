<script lang="ts">
  import IconArrowDown from "lucide-svelte/icons/arrow-down";
  import IconArrowUp from "lucide-svelte/icons/arrow-up";
  import IconMusic from "lucide-svelte/icons/music";
  import IconRepeat from "lucide-svelte/icons/repeat";
  import IconRepeat1 from "lucide-svelte/icons/repeat-1";
  import IconShuffle from "lucide-svelte/icons/shuffle";
  import IconX from "lucide-svelte/icons/x";
  import type { FileSystemItem } from "$lib/state/file-browser.svelte";
  import { ICON_SIZE } from "$lib/constants";
  import { makeTimeString } from "$lib/makeTimeString";
  import { QueueManager } from "$lib/queue-manager";
  import { playerState } from "$lib/state/player.svelte";
  import { queue } from "$lib/state/queue.svelte";
  import { cn } from "$lib/utils";
  import { playVideo } from "$lib/video-playback";

  function isCurrentlyPlaying(item: FileSystemItem): boolean {
    return queue?.currentItem?.path === item.path;
  }

  function handleItemClick(item: FileSystemItem) {
    playVideo(item!.path!);
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
    if (index < queue.items.length - 1) QueueManager.moveItem(index, index + 1);
  }

  function shuffleQueue() {
    QueueManager.shuffleQueue();
  }

  function toggleRepeat() {
    QueueManager.toggleRepeatMode();
  }

  function getRepeatIcon() {
    switch (playerState.repeatMode) {
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

  function getRepeatTitle() {
    switch (playerState.repeatMode) {
      case "off":
        return "Repeat: Off";
      case "all":
        return "Repeat: All";
      case "one":
        return "Repeat: One";
      default:
        return "Repeat: Off";
    }
  }
</script>

<div class="flex h-full flex-col">
  <!-- Queue Items -->
  <div class="no-scrollbar flex-1 overflow-y-auto">
    {#if queue.items.length === 0}
      <div class="flex h-full items-center justify-center">
        <div class="text-center text-zinc-500">
          <IconMusic size={32} class="mx-auto mb-2 opacity-50" />
          <p class="text-sm font-medium">No videos in queue</p>
          <p class="text-xs opacity-75">Open a folder to add videos</p>
        </div>
      </div>
    {:else}
      <div class="space-y-1">
        {#each queue.items as item, index (item.id)}
          <div
            class={cn(
              "group flex items-center gap-2 rounded-md p-2 text-sm transition-colors",
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
              <div class="font-medium text-zinc-200">
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
                onclick={(ev) => {
                  ev.stopPropagation();
                  moveItemDown(index);
                }}
                disabled={index === queue.items.length - 1}
              >
                <IconArrowDown size={ICON_SIZE - 6} />
              </button>
              <button
                class="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-red-400"
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
  <div class="mt-4 border-t border-zinc-800 p-1 pb-0">
    <div class="flex items-center justify-center gap-2">
      <button
        class="flex h-8 w-8 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        onclick={shuffleQueue}
      >
        <IconShuffle size={ICON_SIZE - 4} />
      </button>

      <button
        class={cn(
          "flex h-8 w-8 items-center justify-center rounded transition-colors",
          playerState.repeatMode === "off"
            ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
            : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
        )}
        onclick={toggleRepeat}
      >
        <svelte:component this={getRepeatIcon()} size={ICON_SIZE - 4} />
      </button>
    </div>
  </div>
</div>
