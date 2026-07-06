import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Effect, Layer } from "effect";
import { app } from "electron";
import { LoggerService } from "../logging/Service";
import { UserDataService } from "./Service";

const USER_DATA_DIRECTORY = "persisted-stores";
const STORE_NAME_PATTERN = /^[\w.-]+$/;

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export const UserDataLayer = Layer.effect(
  UserDataService,
  Effect.gen(function* () {
    const logger = yield* LoggerService;

    const getStoreDirectory = (): string => join(app.getPath("userData"), USER_DATA_DIRECTORY);

    const getStorePath = (name: string): string | null => {
      if (!STORE_NAME_PATTERN.test(name)) {
        logger.warn(`Rejected invalid persisted store name: ${name}`);
        return null;
      }

      return join(getStoreDirectory(), `${name}.json`);
    };

    const writeStoreFile = async (name: string, value: string): Promise<void> => {
      const storePath = getStorePath(name);
      if (!storePath) return;

      const tempPath = `${storePath}.tmp`;

      await mkdir(dirname(storePath), { recursive: true });
      await writeFile(tempPath, value, "utf8");
      await rename(tempPath, storePath);
    };

    const writeQueues = new Map<string, Promise<void>>();

    const enqueueStoreWrite = (name: string, write: () => Promise<void>): Promise<void> => {
      const previousWrite = writeQueues.get(name) ?? Promise.resolve();
      const nextWrite = previousWrite
        .then(async () => {
          await write();
        })
        .catch((error) => {
          logger.error(`Failed to write persisted store: ${name}`, error);
        });

      writeQueues.set(name, nextWrite);
      return nextWrite;
    };

    return {
      readPersistedStore: (name) =>
        Effect.promise(async () => {
          const storePath = getStorePath(name);
          if (!storePath) return null;

          try {
            return await readFile(storePath, "utf8");
          } catch (error) {
            if (isNodeError(error) && error.code === "ENOENT") {
              return null;
            }
            logger.error(`Failed to read persisted store: ${name}`, error);
            return null;
          }
        }),
      removePersistedStore: (name) =>
        Effect.promise(async () => {
          await enqueueStoreWrite(name, async () => {
            const storePath = getStorePath(name);
            if (!storePath) return;

            try {
              await unlink(storePath);
            } catch (error) {
              if (!isNodeError(error) || error.code !== "ENOENT") {
                throw error;
              }
            }
          });
        }),
      writePersistedStore: ({ name, value }) =>
        Effect.promise(async () => {
          await enqueueStoreWrite(name, async () => {
            await writeStoreFile(name, value);
          });
        }),
    } satisfies UserDataService["Service"];
  }),
);
