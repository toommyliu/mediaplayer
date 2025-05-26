<script lang="ts">
  interface FileBrowserProps {
    onFileSelect: (filePath: string) => void;
    onFolderSelect: (folderPath: string) => void;
  }

  let { onFileSelect, onFolderSelect }: FileBrowserProps = $props();
</script>

<!-- Hidden component for now - file selection handled through electron dialog -->
<div style="display: none;">
  <!-- File browser modal would go here -->
</div>
