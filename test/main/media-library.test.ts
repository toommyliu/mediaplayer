import type { Dirent, Stats } from "node:fs";
import { assert, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { DurationWorkerPool } from "../../src/main/media/DurationWorkerPool";
import { MediaFileSystem } from "../../src/main/media/MediaFileSystem";
import { MediaLibrary } from "../../src/main/media/MediaLibrary";
import { MediaTools } from "../../src/main/media/MediaTools";

function directoryEntry(name: string, type: "directory" | "file"): Dirent {
  return {
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isDirectory: () => type === "directory",
    isFIFO: () => false,
    isFile: () => type === "file",
    isSocket: () => false,
    isSymbolicLink: () => false,
    name,
    parentPath: "/videos",
  } as Dirent;
}

const dependencies = Layer.mergeAll(
  Layer.succeed(DurationWorkerPool)({
    process: (path) => Effect.succeed(path.endsWith("clip2.mp4") ? 2 : 10),
    processAll: () => Effect.succeed(new Map()),
  }),
  Layer.succeed(MediaFileSystem)({
    readDirectory: (path) =>
      Effect.succeed(
        path === "/videos"
          ? [
              directoryEntry("Season", "directory"),
              directoryEntry("clip10.mp4", "file"),
              directoryEntry("clip2.mp4", "file"),
              directoryEntry(".hidden.mp4", "file"),
              directoryEntry("notes.txt", "file"),
            ]
          : [directoryEntry("episode1.mkv", "file")],
      ),
    rename: () => Effect.void,
    stat: (path) =>
      Effect.succeed({
        mtimeMs: path.includes("clip2") ? 2 : 10,
        size: 100,
      } as Stats),
  }),
  Layer.succeed(MediaTools)({
    probe: () => Effect.succeed({}),
  }),
);

const libraryLayer = MediaLibrary.layer.pipe(Layer.provide(dependencies));

it.effect("MediaLibrary scans supported files and preserves stable natural ordering", () =>
  Effect.gen(function* () {
    const library = yield* MediaLibrary;
    const contents = yield* library.loadDirectoryContents("/videos");

    assert.deepStrictEqual(
      contents.files.map((item) => item.name),
      ["Season", "clip2.mp4", "clip10.mp4"],
    );
    assert.strictEqual(contents.files[0].files?.length, 0);

    const recursive = yield* library.getAllVideoFiles("/videos");
    assert.deepStrictEqual(
      recursive.map((item) => item.name),
      ["episode1.mkv", "clip2.mp4", "clip10.mp4"],
    );
  }).pipe(Effect.provide(libraryLayer)),
);
