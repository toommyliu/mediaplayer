import type { SortOptions } from "../../shared";
import type { DirectoryContents, PickerResult, VideoFileItem } from "../../shared/contracts";
import { Effect, ServiceMap } from "effect";

export type MediaServiceShape = {
  showFilePicker: (mode: "both" | "file" | "folder") => Effect.Effect<PickerResult | null, unknown>;
  loadDirectoryContents: (
    dirPath: string,
    sortOptions?: SortOptions
  ) => Effect.Effect<DirectoryContents, unknown>;
  getAllVideoFilesRecursive: (folderPath: string) => Effect.Effect<VideoFileItem[], unknown>;
};

export class MediaService extends ServiceMap.Service<MediaService, MediaServiceShape>()(
  "main/media/MediaService"
) {}
