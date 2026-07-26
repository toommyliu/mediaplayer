import { execFile } from "node:child_process";
import { chmod, stat } from "node:fs/promises";
import { promisify } from "node:util";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { Context, Effect, Layer } from "effect";
import { MediaProbeError } from "../errors";
import { parseProbeOutput, type ProbeRecord } from "./Metadata";

const FFPROBE_TIMEOUT_MS = 20_000;
const execFileAsync = promisify(execFile);

export interface MediaToolsShape {
  readonly probe: (path: string) => Effect.Effect<ProbeRecord, MediaProbeError>;
}

const ensureExecutable = Effect.fn("MediaTools.ensureExecutable")(function* (
  label: string,
  path: string,
) {
  yield* Effect.tryPromise({
    try: async () => {
      const file = await stat(path);
      if (file.isFile() && (file.mode & 0o111) === 0) {
        await chmod(path, 0o755);
      }
    },
    catch: (cause) => new MediaProbeError({ cause, path }),
  }).pipe(
    Effect.catch((error) =>
      Effect.logWarning("Could not verify media tool permissions", error).pipe(
        Effect.annotateLogs({ mediaTool: label }),
      ),
    ),
  );
});

export class MediaTools extends Context.Service<MediaTools, MediaToolsShape>()(
  "mediaplayer/main/media/MediaTools",
) {
  static readonly layer = Layer.effect(
    MediaTools,
    Effect.gen(function* () {
      yield* Effect.all(
        [
          ensureExecutable("ffmpeg", ffmpegInstaller.path),
          ensureExecutable("ffprobe", ffprobeInstaller.path),
        ],
        { concurrency: 2, discard: true },
      );

      const probe = Effect.fn("MediaTools.probe")(function* (path: string) {
        const { stdout } = yield* Effect.tryPromise({
          try: () =>
            execFileAsync(
              ffprobeInstaller.path,
              ["-v", "error", "-show_format", "-show_streams", "-of", "json", path],
              {
                timeout: FFPROBE_TIMEOUT_MS,
                maxBuffer: 1024 * 1024,
              },
            ),
          catch: (cause) => new MediaProbeError({ cause, path }),
        });

        return yield* Effect.try({
          try: () => parseProbeOutput(stdout),
          catch: (cause) => new MediaProbeError({ cause, path }),
        });
      });

      yield* Effect.logDebug("Media tools initialized").pipe(
        Effect.annotateLogs({
          ffmpegPath: ffmpegInstaller.path,
          ffprobePath: ffprobeInstaller.path,
          service: "MediaTools",
        }),
      );

      return MediaTools.of({ probe });
    }),
  );
}
