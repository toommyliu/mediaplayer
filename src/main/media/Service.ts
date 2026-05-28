import type { Effect } from "effect";
import type { SortOptions } from "../../shared";
import type {
  DirectoryContents,
  PickerResult,
  RenameFileSystemItemInput,
  RenameFileSystemItemResult,
  VideoFileItem,
  VideoMetadata,
} from "../../shared/contracts";
import { ServiceMap } from "effect";

export interface MediaServiceShape {
  showFilePicker: (
    mode: "both" | "file" | "folder",
  ) => Effect.Effect<PickerResult | null, unknown>;
  loadDirectoryContents: (
    dirPath: string,
    sortOptions?: SortOptions,
  ) => Effect.Effect<DirectoryContents, unknown>;
  getAllVideoFilesRecursive: (
    folderPath: string,
  ) => Effect.Effect<VideoFileItem[], unknown>;
  getVideoMetadata: (filePath: string) => Effect.Effect<VideoMetadata, unknown>;
  renameFileSystemItem: (
    input: RenameFileSystemItemInput,
  ) => Effect.Effect<RenameFileSystemItemResult, unknown>;
}

export class MediaService extends ServiceMap.Service<
  MediaService,
  MediaServiceShape
>()("main/media/MediaService") {}
