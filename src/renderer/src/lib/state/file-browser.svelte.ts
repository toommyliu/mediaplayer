import type { FileTreeItem } from "$shared/file-tree-utils";

class FileBrowserState {
  public fileTree = $state<FileTree | null>(null);

  public expandedFolders = $state(new Set<string>());

  public error = $state<string | null>(null);

  public openContextMenu = $state<string | null>(null);

  public currentPath = $state<string | null>(null);

  public isAtRoot = $state(false);

  public originalPath = $state<string | null>(null);

  public sortBy = $state<"duration" | "name">("name");

  public sortDirection = $state<"asc" | "desc">("asc");

  public isLoading = $state(false);

  public loadingFolders = $state(new Set<string>());

  public get fileSystem() {
    return this.fileTree?.files ?? [];
  }

  public reset() {
    this.fileTree = null;
    this.currentPath = null;
    this.isAtRoot = false;
    this.originalPath = null;
    this.isLoading = false;
    this.expandedFolders.clear();
  }
}

export const fileBrowserState = new FileBrowserState();

// Use shared type
export type FileSystemItem = FileTreeItem;

export type FileTree = {
  files: FileSystemItem[];
  rootPath: string;
};
