<script lang="ts">
  import * as Tooltip from "$ui/tooltip/";
  import { Button } from "$ui/button/";

  import LucideVolumeX from "~icons/lucide/volume-x";
  import LucideVolume1 from "~icons/lucide/volume-1";
  import LucideVolume2 from "~icons/lucide/volume-2";

  import { cn } from "$lib/utils";
  import { volume } from "$/lib/state/volume.svelte";
  import { playerState } from "$/lib/state/player.svelte";

  import { fade } from "svelte/transition";

  let isButtonHovering = false;
  let isSliderHovering = false;
  const isDragging = false;
  let isHovering = false;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  function updateHovering() {
    if (isButtonHovering || isSliderHovering) {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      isHovering = true;
    } else {
      // Add a small delay before hiding
      hideTimeout = setTimeout(() => {
        isHovering = false;
        hideTimeout = null;
      }, 150);
    }
  }
</script>

<div class="flex items-center gap-2 rounded-md">
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-white transition-all duration-200 hover:bg-white/20 hover:text-blue-400 focus-visible:ring-blue-400"
          onmouseenter={() => {
            isButtonHovering = true;
            updateHovering();
          }}
          onmouseleave={() => {
            isButtonHovering = false;
            updateHovering();
          }}
        >
          {#if volume.isMuted || volume.value === 0}
            <LucideVolumeX class="size-4" />
          {:else if volume.value <= 0.33}
            <LucideVolume1 class="size-4" />
          {:else}
            <LucideVolume2 class="size-4" />
          {/if}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>
        {volume.isMuted ? "Unmute" : "Mute"}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>

  {#if isHovering}
    <div
      class={cn(
        "relative w-20 transition-opacity duration-150",
        isHovering || isDragging ? "opacity-100" : "opacity-70"
      )}
      transition:fade={{ duration: 150 }}
      onmouseenter={() => {
        isSliderHovering = true;
        updateHovering();
      }}
      onmouseleave={() => {
        isSliderHovering = false;
        updateHovering();
      }}
    >
      <div
        class={cn(
          "relative h-2 rounded-full bg-white/20 lg:h-3",
          !isDragging && "transition-colors duration-200",
          isDragging && "bg-white/30"
        )}
        role="slider"
        tabindex={0}
      >
        <div
          class={cn(
            "absolute inset-0 h-full rounded-full bg-blue-500",
            !isDragging && "transition-all duration-200"
          )}
          style="width: {(volume.isMuted ? 0 : volume.value) * 100}%"
        ></div>

        <div
          class={cn(
            "absolute top-1/2 h-3 w-3 rounded-full shadow-lg",
            "border-2 border-white/50 bg-blue-500 shadow-blue-300/50",
            !isDragging && "transition-all duration-100",
            isDragging || isHovering ? "opacity-100" : "opacity-0"
          )}
          style="left: {(volume.isMuted ? 0 : volume.value) *
            100}%; transform: translateX(-50%) translateY(-50%); z-index: 10;"
        ></div>
      </div>
    </div>
  {/if}
</div>
