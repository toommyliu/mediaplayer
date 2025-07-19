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
}

export const fileBrowserState = new FileBrowserState();

export type FileSystemItem = {
  duration?: number;
  files?: FileSystemItem[];
  name?: string;
  path?: string;
  type?: "folder" | "video";
};

export type FileTree = {
  files: FileSystemItem[];
  rootPath: string;
};

export type DirectoryContents = {
  currentPath: string;
  files: FileSystemItem[];
  isAtRoot: boolean;
  parentPath: string | null;
};
