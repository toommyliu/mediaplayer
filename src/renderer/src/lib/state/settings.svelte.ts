export type FileBrowserCompactness = "auto" | "comfortable" | "compact" | "mini";

export const settings = $state({
  showDialog: false,
  // Auto: decide based on sidebar width; comfortable: full UI; compact: smaller UI; mini: icon-only
  fileBrowserCompactness: "auto" as FileBrowserCompactness
});
