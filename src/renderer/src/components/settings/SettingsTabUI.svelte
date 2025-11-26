<script lang="ts">
  import * as DropdownMenu from "$ui/dropdown-menu";
  import { Label } from "$ui/label";
  import { Checkbox } from "$ui/checkbox";
  import { Button } from "$ui/button";
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
</div>
