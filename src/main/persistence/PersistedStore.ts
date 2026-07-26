import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Context, Effect, Layer, Semaphore } from "effect";
import { app } from "electron";
import { PersistedStoreError } from "../errors";

const USER_DATA_DIRECTORY = "persisted-stores";
const STORE_NAME_PATTERN = /^[\w.-]+$/;

export interface PersistedStoreWrite {
  readonly name: string;
  readonly value: string;
}

export interface PersistedStoreShape {
  readonly read: (name: string) => Effect.Effect<string | null, PersistedStoreError>;
  readonly remove: (name: string) => Effect.Effect<void, PersistedStoreError>;
  readonly write: (input: PersistedStoreWrite) => Effect.Effect<void, PersistedStoreError>;
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export class PersistedStore extends Context.Service<PersistedStore, PersistedStoreShape>()(
  "mediaplayer/main/persistence/PersistedStore",
) {
  static readonly layer = Layer.sync(PersistedStore)(() => {
    const directory = join(app.getPath("userData"), USER_DATA_DIRECTORY);
    const writeLocks = new Map<string, Semaphore.Semaphore>();

    const pathFor = (name: string): string | null =>
      STORE_NAME_PATTERN.test(name) ? join(directory, `${name}.json`) : null;

    const lockFor = (name: string): Semaphore.Semaphore => {
      const existing = writeLocks.get(name);
      if (existing) return existing;
      const created = Semaphore.makeUnsafe(1);
      writeLocks.set(name, created);
      return created;
    };

    const invalidName = (name: string) =>
      Effect.logWarning("Rejected invalid persisted store name").pipe(
        Effect.annotateLogs({ name, service: "PersistedStore" }),
      );

    const read = Effect.fn("PersistedStore.read")(function* (name: string) {
      const path = pathFor(name);
      if (!path) {
        yield* invalidName(name);
        return null;
      }

      return yield* Effect.tryPromise({
        try: () => readFile(path, "utf8"),
        catch: (cause) => new PersistedStoreError({ cause, name, operation: "read" }),
      }).pipe(
        Effect.catch((error) =>
          isMissingFile(error.cause) ? Effect.succeed(null) : Effect.fail(error),
        ),
      );
    });

    const remove = Effect.fn("PersistedStore.remove")(function* (name: string) {
      const path = pathFor(name);
      if (!path) {
        yield* invalidName(name);
        return;
      }

      yield* lockFor(name).withPermit(
        Effect.tryPromise({
          try: () => unlink(path),
          catch: (cause) => new PersistedStoreError({ cause, name, operation: "remove" }),
        }).pipe(
          Effect.catch((error) => (isMissingFile(error.cause) ? Effect.void : Effect.fail(error))),
        ),
      );
    });

    const write = Effect.fn("PersistedStore.write")(function* ({
      name,
      value,
    }: PersistedStoreWrite) {
      const path = pathFor(name);
      if (!path) {
        yield* invalidName(name);
        return;
      }

      const temporaryPath = `${path}.tmp`;
      yield* lockFor(name).withPermit(
        Effect.tryPromise({
          try: async () => {
            await mkdir(dirname(path), { recursive: true });
            await writeFile(temporaryPath, value, "utf8");
            await rename(temporaryPath, path);
          },
          catch: (cause) => new PersistedStoreError({ cause, name, operation: "write" }),
        }),
      );
    });

    return PersistedStore.of({ read, remove, write });
  });
}
