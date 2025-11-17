<script lang="ts">
  import * as DropdownMenu from "$ui/dropdown-menu";
  import { Label } from "$ui/label";
  import { Checkbox } from "$ui/checkbox";
</script>

<div class="space-y-6">
  <div class="space-y-2">
    <Label for="sidebar-default">Sidebar Default State</Label>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          Open
          <svg class="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
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
