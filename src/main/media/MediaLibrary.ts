import type { FileTreeItem, SortOptions } from "../../shared";
import { flattenVideoFiles } from "../../shared";
import type {
  DirectoryContents,
  RenameFileSystemItemInput,
  RenameFileSystemItemResult,
  VideoFileItem,
  VideoMetadata,
} from "../../shared/contracts";
import { cpus } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { Context, Effect, Layer } from "effect";
import { DEFAULT_SORT_OPTIONS } from "../../shared/constants";
import { FileSystemError, MediaProbeError } from "../errors";
import { DurationWorkerPool } from "./DurationWorkerPool";
import {
  buildSortedFileTree,
  isHidden,
  isVideoFile,
  normalizePath,
  type FileTreeEntry,
} from "./FileTree";
import { MediaFileSystem } from "./MediaFileSystem";
import { MediaTools } from "./MediaTools";
import { mergeProbeMetadata } from "./Metadata";

const DIRECTORY_SCAN_CONCURRENCY = Math.max(2, Math.min(16, cpus().length * 2));

export interface MediaLibraryShape {
  readonly buildFileTree: (
    path: string,
    sortOptions?: SortOptions,
  ) => Effect.Effect<FileTreeItem[], FileSystemError>;
  readonly getAllVideoFiles: (path: string) => Effect.Effect<VideoFileItem[], FileSystemError>;
  readonly getVideoMetadata: (path: string) => Effect.Effect<VideoMetadata, FileSystemError>;
  readonly loadDirectoryContents: (
    path: string,
    sortOptions?: SortOptions,
  ) => Effect.Effect<DirectoryContents, FileSystemError>;
  readonly renameFileSystemItem: (
    input: RenameFileSystemItemInput,
  ) => Effect.Effect<RenameFileSystemItemResult, FileSystemError>;
}

function recoverDuration(path: string, error: unknown): Effect.Effect<number> {
  return Effect.logWarning("Could not determine video duration", error).pipe(
    Effect.annotateLogs({ path }),
    Effect.as(0),
  );
}

export class MediaLibrary extends Context.Service<MediaLibrary, MediaLibraryShape>()(
  "mediaplayer/main/media/MediaLibrary",
) {
  static readonly layer = Layer.effect(
    MediaLibrary,
    Effect.gen(function* () {
      const durations = yield* DurationWorkerPool;
      const fileSystem = yield* MediaFileSystem;
      const tools = yield* MediaTools;

      const entryModifiedAt = Effect.fn("MediaLibrary.entryModifiedAt")(function* (path: string) {
        return yield* fileSystem.stat(path).pipe(
          Effect.map((stats) => stats.mtimeMs),
          Effect.catch((error) =>
            Effect.logWarning("Could not read modified time", error).pipe(
              Effect.annotateLogs({ path }),
              Effect.as(undefined),
            ),
          ),
        );
      });

      const scanDirectory = Effect.fn("MediaLibrary.scanDirectory")(function* (
        directoryPath: string,
        recursive: boolean,
      ): Effect.fn.Return<ReadonlyArray<FileTreeEntry>, FileSystemError> {
        const directoryEntries = yield* fileSystem.readDirectory(directoryPath);
        const visibleEntries = directoryEntries.filter((entry) => !isHidden(entry.name));

        return yield* Effect.all(
          visibleEntries.map((entry) => {
            const path = normalizePath(join(directoryPath, entry.name));

            if (entry.isDirectory()) {
              return Effect.all({
                files: recursive
                  ? scanDirectory(path, true).pipe(
                      Effect.catch((error) =>
                        Effect.logWarning("Could not scan subdirectory", error).pipe(
                          Effect.annotateLogs({ path }),
                          Effect.as([] as ReadonlyArray<FileTreeEntry>),
                        ),
                      ),
                    )
                  : Effect.succeed([] as ReadonlyArray<FileTreeEntry>),
                modifiedAtMs: entryModifiedAt(path),
              }).pipe(
                Effect.map(
                  ({ files, modifiedAtMs }): FileTreeEntry => ({
                    files,
                    modifiedAtMs,
                    name: entry.name,
                    path,
                    type: "folder",
                  }),
                ),
              );
            }

            if (!entry.isFile() || !isVideoFile(entry.name)) {
              return Effect.succeed(null);
            }

            return Effect.all({
              duration: durations
                .process(path)
                .pipe(Effect.catch((error) => recoverDuration(path, error))),
              modifiedAtMs: entryModifiedAt(path),
            }).pipe(
              Effect.map(
                ({ duration, modifiedAtMs }): FileTreeEntry => ({
                  duration,
                  modifiedAtMs,
                  name: entry.name,
                  path,
                  type: "video",
                }),
              ),
            );
          }),
          { concurrency: DIRECTORY_SCAN_CONCURRENCY },
        ).pipe(
          Effect.map((entries) =>
            entries.filter((entry): entry is FileTreeEntry => entry !== null),
          ),
        );
      });

      const buildFileTree = Effect.fn("MediaLibrary.buildFileTree")(function* (
        path: string,
        sortOptions: SortOptions = DEFAULT_SORT_OPTIONS,
      ) {
        const entries = yield* scanDirectory(path, true);
        return buildSortedFileTree(entries, sortOptions);
      });

      const loadDirectoryContents = Effect.fn("MediaLibrary.loadDirectoryContents")(function* (
        path: string,
        sortOptions: SortOptions = DEFAULT_SORT_OPTIONS,
      ) {
        const currentPath = normalizePath(resolve(path));
        const parentPath = normalizePath(dirname(currentPath));
        const entries = yield* scanDirectory(currentPath, false);
        const isAtRoot = parentPath === currentPath;

        return {
          currentPath,
          files: buildSortedFileTree(entries, sortOptions),
          isAtRoot,
          parentPath: isAtRoot ? null : parentPath,
        };
      });

      const getAllVideoFiles = Effect.fn("MediaLibrary.getAllVideoFiles")(function* (path: string) {
        const entries = yield* scanDirectory(path, true);
        return flattenVideoFiles(
          buildSortedFileTree(entries, DEFAULT_SORT_OPTIONS),
        ) satisfies VideoFileItem[];
      });

      const getVideoMetadata = Effect.fn("MediaLibrary.getVideoMetadata")(function* (path: string) {
        const resolvedPath = normalizePath(resolve(path));
        const stats = yield* fileSystem.stat(resolvedPath);
        const metadata: VideoMetadata = {
          file: {
            extension: extname(resolvedPath).slice(1),
            modifiedAtMs: stats.mtimeMs,
            name: basename(resolvedPath),
            path: resolvedPath,
            sizeBytes: stats.size,
          },
        };

        return yield* tools.probe(resolvedPath).pipe(
          Effect.map((probe) => mergeProbeMetadata(metadata, probe)),
          Effect.catch((error: MediaProbeError) =>
            Effect.logWarning("Could not read video metadata", error).pipe(
              Effect.annotateLogs({ path: resolvedPath }),
              Effect.as({
                ...metadata,
                probeError:
                  error.cause instanceof Error ? error.cause.message : String(error.cause),
              }),
            ),
          ),
        );
      });

      const renameFileSystemItem = Effect.fn("MediaLibrary.renameFileSystemItem")(function* ({
        newName,
        path,
      }: RenameFileSystemItemInput) {
        const name = newName.trim();
        if (!name) {
          return yield* new FileSystemError({
            cause: new Error("Name is required"),
            operation: "rename",
            path,
          });
        }
        if (basename(name) !== name) {
          return yield* new FileSystemError({
            cause: new Error("Name cannot include path separators"),
            operation: "rename",
            path,
          });
        }

        const oldPath = normalizePath(resolve(path));
        const newPath = normalizePath(join(dirname(oldPath), name));
        if (oldPath !== newPath) yield* fileSystem.rename(oldPath, newPath);

        return { name, newPath, oldPath };
      });

      return MediaLibrary.of({
        buildFileTree,
        getAllVideoFiles,
        getVideoMetadata,
        loadDirectoryContents,
        renameFileSystemItem,
      });
    }),
  );
}
