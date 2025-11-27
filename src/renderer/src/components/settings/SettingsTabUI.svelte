<script lang="ts">
  import * as DropdownMenu from "$ui/dropdown-menu";
  import { Label } from "$ui/label";
  import { Checkbox } from "$ui/checkbox";
  import { Button } from "$ui/button";
  import {
    notificationSettings,
    type NotificationPosition
  } from "$lib/state/notification-settings.svelte";

  const positionOptions: { value: NotificationPosition; label: string }[] = [
    { value: "top-left", label: "Top Left" },
    { value: "top-right", label: "Top Right" },
    { value: "bottom-left", label: "Bottom Left" },
    { value: "bottom-right", label: "Bottom Right" }
  ];

  const positionLabel = $derived(
    positionOptions.find((opt) => opt.value === notificationSettings.upNextPosition)?.label ||
      "Top Right"
  );
</script>

<div class="space-y-6">
  <div class="space-y-2">
    <Label for="sidebar-default">Sidebar Default State</Label>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <div class="w-full">
          <Button variant="outline" class="w-full justify-between font-normal">
            Open
            <svg
              class="h-4 w-4 opacity-50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Button>
        </div>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item>Open</DropdownMenu.Item>
        <DropdownMenu.Item>Closed</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <div class="flex items-center space-x-2">
    <Checkbox id="tooltips" />
    <Label for="tooltips">Show Tooltips</Label>
  </div>

  <!-- Video Notifications Section -->
  <div class="border-border space-y-4 border-t pt-4">
    <h3 class="text-sm font-semibold">Video Notifications</h3>

    <div class="flex items-center space-x-2">
      <Checkbox
        id="upnext-enabled"
        checked={notificationSettings.upNextEnabled}
        onCheckedChange={(checked) => {
          notificationSettings.upNextEnabled = checked === true;
        }}
      />
      <Label for="upnext-enabled">Show "Up Next" Notification</Label>
    </div>

    {#if notificationSettings.upNextEnabled}
      <div class="space-y-2 pl-6">
        <Label for="upnext-position">Notification Position</Label>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <div class="w-full">
              <Button variant="outline" class="w-full justify-between font-normal">
                {positionLabel}
                <svg
                  class="h-4 w-4 opacity-50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </Button>
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {#each positionOptions as option (option.value)}
              <DropdownMenu.Item
                onclick={() => {
                  notificationSettings.upNextPosition = option.value;
                }}
              >
                {option.label}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    {/if}
  </div>
</div>
