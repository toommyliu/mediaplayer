import type { Dirent, Stats } from "node:fs";
import { readdir, rename, stat } from "node:fs/promises";
import { Context, Effect, Layer } from "effect";
import { FileSystemError } from "../errors";

export interface MediaFileSystemShape {
  readonly readDirectory: (path: string) => Effect.Effect<ReadonlyArray<Dirent>, FileSystemError>;
  readonly rename: (oldPath: string, newPath: string) => Effect.Effect<void, FileSystemError>;
  readonly stat: (path: string) => Effect.Effect<Stats, FileSystemError>;
}

export class MediaFileSystem extends Context.Service<MediaFileSystem, MediaFileSystemShape>()(
  "mediaplayer/main/media/MediaFileSystem",
) {
  static readonly layer = Layer.succeed(MediaFileSystem)({
    readDirectory: (path) =>
      Effect.tryPromise({
        try: () => readdir(path, { withFileTypes: true }),
        catch: (cause) => new FileSystemError({ cause, operation: "readDirectory", path }),
      }),
    rename: (oldPath, newPath) =>
      Effect.tryPromise({
        try: () => rename(oldPath, newPath),
        catch: (cause) => new FileSystemError({ cause, operation: "rename", path: oldPath }),
      }),
    stat: (path) =>
      Effect.tryPromise({
        try: () => stat(path),
        catch: (cause) => new FileSystemError({ cause, operation: "stat", path }),
      }),
  });
}
