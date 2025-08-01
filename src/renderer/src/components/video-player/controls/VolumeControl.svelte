<script lang="ts">
  import * as Tooltip from "$ui/tooltip/";
  import { Button } from "$ui/button/";

  import LucideVolumeX from "~icons/lucide/volume-x";
  import LucideVolume1 from "~icons/lucide/volume-1";
  import LucideVolume2 from "~icons/lucide/volume-2";

  import { cn } from "$lib/utils";
  import { volume } from "$/lib/state/volume.svelte";

  import { fade } from "svelte/transition";

  let isDragging = $state(false);
  let isHovering = $state(false);
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  let sliderRef = $state<HTMLDivElement | null>(null);
  let containerRef = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (isHovering && hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    } else if (!isHovering) {
      if (hideTimeout) clearTimeout(hideTimeout);

      hideTimeout = setTimeout(() => {
        isHovering = false;
        hideTimeout = null;
      }, 150);
    }
  });

  function handleMouseLeave(ev: MouseEvent) {
    // If the mouse is moving to a child of the container, do nothing.
    if (containerRef?.contains(ev.relatedTarget as Node)) return;
    isHovering = false;
  }

  function getSliderValueFromEvent(ev: MouseEvent | TouchEvent) {
    if (!sliderRef) return volume.value;

    const rect = sliderRef.getBoundingClientRect();
    let clientX = 0;

    if (ev instanceof MouseEvent) {
      clientX = ev.clientX;
    }

    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    return percent;
  }

  function handleSliderClick(ev: MouseEvent) {
    const value = getSliderValueFromEvent(ev);
    volume.value = value;
    if (volume.isMuted && value > 0) {
      volume.isMuted = false;
    }
  }

  function handleSliderPointerDown(ev: MouseEvent) {
    isDragging = true;

    updateSlider(ev);
    window.addEventListener("mousemove", handleSliderPointerMove);
    window.addEventListener("mouseup", handleSliderPointerUp);
  }

  function handleSliderPointerMove(ev: MouseEvent) {
    updateSlider(ev);
  }

  function handleSliderPointerUp(ev: MouseEvent) {
    isDragging = false;

    updateSlider(ev);

    window.removeEventListener("mousemove", handleSliderPointerMove);
    window.removeEventListener("mouseup", handleSliderPointerUp);
  }

  function updateSlider(ev: MouseEvent) {
    if (ev instanceof MouseEvent && ev.clientX === 0) return;

    const value = getSliderValueFromEvent(ev);
    volume.value = value;
  }
</script>

<div
  bind:this={containerRef}
  class="flex items-center rounded-md"
  onmouseenter={() => (isHovering = true)}
  onmouseleave={handleMouseLeave}
>
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Button
          variant="ghost"
          size="icon"
          class="flex-shrink-0"
          onclick={() => (volume.isMuted = !volume.isMuted)}
          onmouseenter={() => (isHovering = true)}
        >
          {#if volume.isMuted}
            <LucideVolumeX class="size-4 text-white" />
          {:else if volume.value <= 0.33}
            <LucideVolume1 class="size-4 text-white" />
          {:else}
            <LucideVolume2 class="size-4 text-white" />
          {/if}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>
        {volume.isMuted ? "Unmute" : "Mute"}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>

  <div
    class={cn(
      "relative flex items-center transition-[margin,width] duration-150 ease-out",
      isHovering || isDragging ? "mx-2 w-24" : "ml-0 w-0"
    )}
  >
    {#if isHovering || isDragging}
      <div
        in:fade={{ duration: 100, delay: 50 }}
        out:fade={{ duration: 100 }}
        bind:this={sliderRef}
        class={cn(
          "relative h-1.5 w-full rounded-full bg-white/20",
          isDragging ? "bg-white/30" : ""
        )}
        role="slider"
        tabindex={0}
        onmousedown={handleSliderPointerDown}
        ontouchstart={handleSliderPointerDown}
        onclick={handleSliderClick}
        onkeydown={(ev) => {
          if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") {
            ev.preventDefault();
            volume.decreaseTick();
          } else if (ev.key === "ArrowRight" || ev.key === "ArrowUp") {
            ev.preventDefault();
            volume.increaseTick();
          } else if (ev.key === " " || ev.key === "Enter") {
            ev.preventDefault();
            volume.isMuted = !volume.isMuted;
          }
        }}
      >
        <div
          class={cn(
            "absolute inset-0 h-full rounded-full bg-white",
            !isDragging && "transition-all duration-200"
          )}
          style="width: {(volume.isMuted ? 0 : volume.value) * 100}%"
        ></div>
        <div
          class={cn(
            "absolute -top-1/2 h-3 w-3 -translate-x-1/2 transform rounded-full bg-white shadow",
            !isDragging && "transition-all duration-200"
          )}
          style="left: {(volume.isMuted ? 0 : volume.value) * 100}%;"
        ></div>
      </div>
    {/if}
  </div>
</div>
