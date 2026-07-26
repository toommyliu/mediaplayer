import { cpus } from "node:os";
import { Worker } from "node:worker_threads";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { Cache, Context, Effect, Exit, Layer, Pool } from "effect";
import { WorkerPoolError } from "../errors";
import fileWorkerPath from "./worker/FileWorker?modulePath";
import type {
  DurationWorkerData,
  DurationWorkerRequest,
  DurationWorkerResponse,
} from "./worker/Protocol";

const POOL_SIZE = Math.max(2, Math.min(8, cpus().length));
const CACHE_CAPACITY = 20_000;

export interface DurationWorkerPoolShape {
  readonly process: (path: string) => Effect.Effect<number, WorkerPoolError>;
  readonly processAll: (paths: ReadonlyArray<string>) => Effect.Effect<ReadonlyMap<string, number>>;
}

function acquireWorker() {
  return Effect.acquireRelease(
    Effect.sync(() => {
      const worker = new Worker(fileWorkerPath, {
        resourceLimits: {
          maxOldGenerationSizeMb: 64,
          maxYoungGenerationSizeMb: 16,
        },
        workerData: {
          ffprobePath: ffprobeInstaller.path,
        } satisfies DurationWorkerData,
      });
      let requestId = 0;

      const probe = (path: string): Effect.Effect<number, WorkerPoolError> =>
        Effect.callback<number, WorkerPoolError>((resume, signal) => {
          const request: DurationWorkerRequest = { filePath: path, id: requestId++ };

          const cleanup = (): void => {
            worker.off("message", onMessage);
            worker.off("error", onError);
            worker.off("exit", onExit);
            signal.removeEventListener("abort", cleanup);
          };
          const fail = (cause: unknown): void => {
            cleanup();
            resume(Effect.fail(new WorkerPoolError({ cause, path })));
          };
          const onMessage = (response: DurationWorkerResponse): void => {
            if (response.id !== request.id) return;
            cleanup();
            if (response.error) {
              resume(
                Effect.fail(
                  new WorkerPoolError({
                    cause: new Error(response.error),
                    path,
                  }),
                ),
              );
              return;
            }
            resume(Effect.succeed(response.duration ?? 0));
          };
          const onError = (error: Error): void => fail(error);
          const onExit = (code: number): void =>
            fail(new Error(`Duration worker exited before completing task (code ${code})`));

          worker.on("message", onMessage);
          worker.once("error", onError);
          worker.once("exit", onExit);
          signal.addEventListener("abort", cleanup, { once: true });

          try {
            worker.postMessage(request);
          } catch (cause) {
            fail(cause);
          }
        }).pipe(
          Effect.withSpan("DurationWorkerPool.workerProbe", {
            attributes: { path },
          }),
        );

      return { probe, worker };
    }),
    ({ worker }) =>
      Effect.tryPromise(() => worker.terminate()).pipe(
        Effect.catch((cause) => Effect.logWarning("Failed to terminate duration worker", cause)),
        Effect.asVoid,
      ),
  );
}

export class DurationWorkerPool extends Context.Service<
  DurationWorkerPool,
  DurationWorkerPoolShape
>()("mediaplayer/main/media/DurationWorkerPool") {
  static readonly layer = Layer.effect(
    DurationWorkerPool,
    Effect.gen(function* () {
      const pool = yield* Pool.make({
        acquire: acquireWorker(),
        size: POOL_SIZE,
      });

      const processUncached = Effect.fn("DurationWorkerPool.processUncached")(function* (
        path: string,
      ) {
        return yield* Effect.scoped(
          Effect.gen(function* () {
            const client = yield* Pool.get(pool);
            return yield* client
              .probe(path)
              .pipe(Effect.tapError(() => Pool.invalidate(pool, client)));
          }),
        );
      });

      const cache = yield* Cache.makeWith(processUncached, {
        capacity: CACHE_CAPACITY,
        timeToLive: (exit) => (Exit.isSuccess(exit) ? "15 minutes" : "0 millis"),
      });

      const process = Effect.fn("DurationWorkerPool.process")(function* (path: string) {
        return yield* Cache.get(cache, path);
      });

      const processAll = Effect.fn("DurationWorkerPool.processAll")(function* (
        paths: ReadonlyArray<string>,
      ) {
        const uniquePaths = Array.from(new Set(paths));
        const values = yield* Effect.all(
          uniquePaths.map((path) =>
            process(path).pipe(
              Effect.catch((error) =>
                Effect.logWarning("Failed to read video duration", error).pipe(
                  Effect.annotateLogs({ path }),
                  Effect.as(0),
                ),
              ),
              Effect.map((duration) => [path, duration] as const),
            ),
          ),
          { concurrency: "unbounded" },
        );
        return new Map(values);
      });

      yield* Effect.logDebug("Duration worker pool initialized").pipe(
        Effect.annotateLogs({
          cacheCapacity: CACHE_CAPACITY,
          poolSize: POOL_SIZE,
          service: "DurationWorkerPool",
        }),
      );

      return DurationWorkerPool.of({ process, processAll });
    }),
  );
}
