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

  function setHover(hover: boolean) {
    if (hover) {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      isHovering = true;
    } else {
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        isHovering = false;
        hideTimeout = null;
      }, 150);
    }
  }

  function handleMouseEnter() {
    setHover(true);
  }

  function handleMouseLeave(ev: MouseEvent) {
    // If the mouse is moving to a child of the container, do nothing.
    if (containerRef?.contains(ev.relatedTarget as Node)) return;

    setHover(false);
  }

  function getSliderValueFromEvent(ev: MouseEvent | TouchEvent) {
    if (!sliderRef) return volume.value;
    const rect = sliderRef.getBoundingClientRect();
    let clientX = 0;
    if (ev instanceof MouseEvent) {
      clientX = ev.clientX;
    } else if (ev.touches && ev.touches.length > 0) {
      clientX = ev.touches[0].clientX;
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

  function handleSliderPointerDown(ev: MouseEvent | TouchEvent) {
    isDragging = true;
    document.body.style.userSelect = "none";
    updateSlider(ev);
    window.addEventListener("mousemove", handleSliderPointerMove);
    window.addEventListener("touchmove", handleSliderPointerMove);
    window.addEventListener("mouseup", handleSliderPointerUp);
    window.addEventListener("touchend", handleSliderPointerUp);
  }

  function handleSliderPointerMove(ev: MouseEvent | TouchEvent) {
    updateSlider(ev);
  }

  function handleSliderPointerUp(ev: MouseEvent | TouchEvent) {
    isDragging = false;
    document.body.style.userSelect = "";
    updateSlider(ev);
    window.removeEventListener("mousemove", handleSliderPointerMove);
    window.removeEventListener("touchmove", handleSliderPointerMove);
    window.removeEventListener("mouseup", handleSliderPointerUp);
    window.removeEventListener("touchend", handleSliderPointerUp);
  }

  function updateSlider(ev: MouseEvent | TouchEvent) {
    if (ev instanceof MouseEvent && ev.clientX === 0) return;
    if (ev instanceof TouchEvent && ev.touches.length === 0) return;

    const value = getSliderValueFromEvent(ev);
    volume.value = value;
    if (volume.isMuted && value > 0) {
      volume.isMuted = false;
    }
  }
</script>

<div
  bind:this={containerRef}
  class="flex items-center rounded-md"
  onmouseenter={handleMouseEnter}
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
          onmouseenter={handleMouseEnter}
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
          "relative h-1.5 w-full cursor-pointer rounded-full bg-white/20",
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
            const newValue = volume.value - 0.05;
            volume.value = Math.max(0, newValue);
            if (volume.isMuted && volume.value > 0) volume.isMuted = false;
          } else if (ev.key === "ArrowRight" || ev.key === "ArrowUp") {
            ev.preventDefault();
            const newValue = volume.value + 0.05;
            volume.value = Math.min(1, newValue);
            if (volume.isMuted && volume.value > 0) volume.isMuted = false;
          } else if (ev.key === "Home") {
            ev.preventDefault();
            volume.value = 0;
          } else if (ev.key === "End") {
            ev.preventDefault();
            volume.value = 1;
            if (volume.isMuted) volume.isMuted = false;
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
            "absolute -top-1/2 h-3 w-3 rounded-full bg-white shadow",
            !isDragging && "transition-all duration-200"
          )}
          style="left: {(volume.isMuted ? 0 : volume.value) * 100}%; transform: translateX(-50%);"
        ></div>
      </div>
    {/if}
  </div>
</div>
