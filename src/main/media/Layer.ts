import type { BrowserWindow, OpenDialogOptions } from "electron";
import type { FileTreeItem, SortOptions } from "../../shared";
import type {
  DirectoryContents,
  PickerResult,
  RenameFileSystemItemInput,
  RenameFileSystemItemResult,
  VideoFileItem,
  VideoMetadata,
} from "../../shared/contracts";
import { execFile } from "node:child_process";
import { chmod, readdir, rename, stat } from "node:fs/promises";
import { cpus } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { Effect, Layer } from "effect";
import { app, dialog } from "electron";
import { DEFAULT_SORT_OPTIONS, VIDEO_EXTENSIONS } from "../../shared/constants";
import { LoggerService } from "../logging/Service";
import { UserDataService } from "../user-data/Service";
import { WindowService } from "../windows/Service";
import { FileTree } from "./FileTree";
import { MediaService } from "./Service";
import fileWorkerPath from "./worker/FileWorker?modulePath";
import { WorkerPool } from "./worker/WorkerPool";

const CPU_COUNT = cpus().length;
const WORKER_POOL_SIZE = Math.max(2, Math.min(8, CPU_COUNT));
const DIRECTORY_SCAN_CONCURRENCY = Math.max(2, Math.min(16, CPU_COUNT * 2));
const PREVIOUS_OPEN_DIRECTORY_STORE = "previous-open-directory";
const FFPROBE_TIMEOUT_MS = 20_000;

const execFileAsync = promisify(execFile);

type FfprobeRecord = Record<string, unknown>;

interface IndexedPath {
  index: number;
  path: string;
}

interface IndexedModifiedTime {
  index: number;
  modifiedAtMs: number | undefined;
}

function isRecord(value: unknown): value is FfprobeRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(record: FfprobeRecord | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumber(record: FfprobeRecord | undefined, key: string): number | undefined {
  const value = record?.[key];
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseFrameRate(value: string | undefined): number | undefined {
  if (!value || value === "0/0") return undefined;

  const [numerator, denominator] = value.split("/").map(Number);
  const parsed = denominator ? numerator / denominator : Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function getStream(streams: unknown, codecType: "audio" | "video"): FfprobeRecord | undefined {
  if (!Array.isArray(streams)) return undefined;

  return streams.find((stream) => isRecord(stream) && stream.codec_type === codecType) as
    | FfprobeRecord
    | undefined;
}

function parseProbeOutput(stdout: string): FfprobeRecord {
  const parsed: unknown = JSON.parse(stdout);
  if (!isRecord(parsed)) throw new Error("ffprobe returned invalid metadata");

  return parsed;
}

export const MediaLayer = Layer.effect(
  MediaService,
  Effect.gen(function* () {
    const logger = yield* LoggerService;
    const userData = yield* UserDataService;
    const windows = yield* WindowService;

    let previousPath: string | null = null;
    let isFfmpegInitialized = false;

    const parsePreviousPath = (value: string | null): string | null => {
      if (!value) return null;

      try {
        const parsed: unknown = JSON.parse(value);
        if (
          parsed &&
          typeof parsed === "object" &&
          "path" in parsed &&
          typeof parsed.path === "string"
        ) {
          return parsed.path;
        }
      } catch {
        return value;
      }

      return null;
    };

    const loadPreviousPath = Effect.gen(function* () {
      if (previousPath) return previousPath;

      const storedPath = yield* userData.readPersistedStore(PREVIOUS_OPEN_DIRECTORY_STORE);
      previousPath = parsePreviousPath(storedPath);
      return previousPath;
    });

    const setPreviousPath = (path: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        previousPath = FileTree.normalizePath(path);
        logger.debug(`previousPath set to: ${previousPath}`);
        yield* userData.writePersistedStore({
          name: PREVIOUS_OPEN_DIRECTORY_STORE,
          value: JSON.stringify({ path: previousPath }),
        });
      });

    const getModifiedAtMs = (path: string) =>
      Effect.tryPromise({
        try: async () => {
          const fileStats = await stat(path);
          return fileStats.mtimeMs;
        },
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) => {
          logger.error(`Error reading modified time for ${path}`, error);
          return Effect.succeed(undefined);
        }),
      );

    const readModifiedTimes = (tasks: IndexedPath[]) =>
      tasks.length > 0
        ? Effect.all(
            tasks.map((task) =>
              getModifiedAtMs(task.path).pipe(
                Effect.map(
                  (modifiedAtMs): IndexedModifiedTime => ({
                    index: task.index,
                    modifiedAtMs,
                  }),
                ),
              ),
            ),
            { concurrency: DIRECTORY_SCAN_CONCURRENCY },
          )
        : Effect.succeed([] as IndexedModifiedTime[]);

    const workerPool = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: async () => {
          const pool = new WorkerPool(WORKER_POOL_SIZE, fileWorkerPath, {
            cacheMaxEntries: 20_000,
            cacheTtlMs: 15 * 60 * 1000,
          });
          await pool.initialize();
          logger.debug(`media worker pool initialized with ${WORKER_POOL_SIZE} workers`);
          return pool;
        },
        catch: (error) => error,
      }),
      (pool) =>
        Effect.tryPromise({
          try: async () => {
            await pool.terminate();
          },
          catch: () => undefined,
        }).pipe(Effect.catch(() => Effect.void)),
    );

    const doFfmpegInit = Effect.tryPromise({
      try: async () => {
        if (isFfmpegInitialized) return;

        logger.debug("initializing ffmpeg and ffprobe");

        try {
          const ffmpegStats = await stat(ffmpegInstaller.path);
          const isExecutable = ffmpegStats.mode & 0o111;

          if (ffmpegStats.isFile() && !isExecutable) {
            logger.debug("ffmpeg does not have execute permissions, fixing...");
            await chmod(ffmpegInstaller.path, 0o755);
          }
        } catch (error) {
          logger.error("Could not check/fix ffmpeg permissions", error);
        }

        try {
          const ffprobeStats = await stat(ffprobeInstaller.path);
          const isExecutable = ffprobeStats.mode & 0o111;

          if (ffprobeStats.isFile() && !isExecutable) {
            logger.debug("ffprobe does not have execute permissions, fixing...");
            await chmod(ffprobeInstaller.path, 0o755);
          }
        } catch (error) {
          logger.error("Could not check/fix ffprobe permissions", error);
        }

        isFfmpegInitialized = true;
      },
      catch: (error) => error,
    });

    const buildFileTree = (
      dirPath: string,
      sortOptions: SortOptions = DEFAULT_SORT_OPTIONS,
    ): Effect.Effect<PickerResult, unknown> =>
      Effect.gen(function* () {
        yield* doFfmpegInit;

        const rootPath = FileTree.normalizePath(dirPath);
        const ret: PickerResult = {
          type: "folder",
          rootPath,
          tree: [],
        };

        const entries: {
          duration?: number;
          files?: FileTreeItem[];
          modifiedAtMs?: number;
          name: string;
          path: string;
          type: "folder" | "video";
        }[] = [];

        const modifiedTimeTasks: IndexedPath[] = [];
        const videoFileTasks: IndexedPath[] = [];
        const subdirectoryTasks: {
          path: string;
          index: number;
          effect: Effect.Effect<PickerResult, unknown>;
        }[] = [];

        const dirEntries = yield* Effect.tryPromise({
          try: async () => await readdir(dirPath, { withFileTypes: true }),
          catch: (error) => error,
        });

        for (const entry of dirEntries) {
          if (FileTree.isHidden(entry.name)) continue;

          if (entry.isDirectory()) {
            const subDirPath = FileTree.normalizePath(join(dirPath, entry.name));
            const index = entries.length;

            entries.push({
              files: [],
              name: entry.name,
              path: subDirPath,
              type: "folder",
            });
            modifiedTimeTasks.push({ path: subDirPath, index });

            subdirectoryTasks.push({
              path: subDirPath,
              index,
              effect: buildFileTree(subDirPath, sortOptions),
            });
          } else {
            const filePath = FileTree.normalizePath(join(dirPath, entry.name));
            if (FileTree.isVideoFile(entry.name)) {
              const index = entries.length;
              entries.push({
                name: entry.name,
                path: filePath,
                type: "video",
              });
              modifiedTimeTasks.push({ path: filePath, index });
              videoFileTasks.push({ path: filePath, index });
            }
          }
        }

        const { modifiedTimeResults, subdirectoryResults, durationMap } = yield* Effect.all({
          modifiedTimeResults: readModifiedTimes(modifiedTimeTasks),
          subdirectoryResults: Effect.all(
            subdirectoryTasks.map((task) =>
              task.effect.pipe(
                Effect.catch((error) => {
                  logger.error(`Error processing subdirectory ${task.path}`, error);
                  return Effect.succeed({
                    type: "folder",
                    rootPath: task.path,
                    tree: [],
                  } as PickerResult);
                }),
              ),
            ),
            { concurrency: DIRECTORY_SCAN_CONCURRENCY },
          ),
          durationMap:
            videoFileTasks.length > 0
              ? Effect.tryPromise({
                  try: async () =>
                    await workerPool.processFiles(
                      videoFileTasks.map((task) => task.path),
                      (filePath, error) => {
                        logger.error(`Error getting duration for ${filePath}`, error);
                      },
                    ),
                  catch: (error) => error,
                }).pipe(
                  Effect.catch((error) => {
                    logger.error("Error while processing video durations", error);
                    return Effect.succeed(new Map<string, number>());
                  }),
                )
              : Effect.succeed(new Map<string, number>()),
        });

        for (const result of modifiedTimeResults) {
          entries[result.index].modifiedAtMs = result.modifiedAtMs;
        }

        for (let i = 0; i < subdirectoryTasks.length; i++) {
          const result = subdirectoryResults[i];
          entries[subdirectoryTasks[i].index].files = result.type === "folder" ? result.tree : [];
        }

        for (let i = 0; i < videoFileTasks.length; i++) {
          entries[videoFileTasks[i].index].duration = durationMap.get(videoFileTasks[i].path) ?? 0;
        }

        ret.tree = FileTree.buildSortedFileTree(entries, sortOptions);
        return ret;
      });

    const loadDirectoryContents = (
      dirPath: string,
      sortOptions: SortOptions = DEFAULT_SORT_OPTIONS,
    ): Effect.Effect<DirectoryContents, unknown> =>
      Effect.gen(function* () {
        const resolvedPath = FileTree.normalizePath(resolve(dirPath));

        const entries = yield* Effect.tryPromise({
          try: async () => await readdir(resolvedPath, { withFileTypes: true }),
          catch: (error) => error,
        });

        const parentPath = FileTree.normalizePath(dirname(resolvedPath));
        const isAtRoot = resolvedPath === parentPath;

        const rawEntries: {
          duration?: number;
          files?: FileTreeItem[];
          modifiedAtMs?: number;
          name: string;
          path: string;
          type: "folder" | "video";
        }[] = [];

        const modifiedTimeTasks: IndexedPath[] = [];
        const videoFileTasks: IndexedPath[] = [];

        for (const entry of entries) {
          if (FileTree.isHidden(entry.name)) continue;

          const fullPath = FileTree.normalizePath(join(resolvedPath, entry.name));

          if (entry.isDirectory()) {
            const index = rawEntries.length;
            rawEntries.push({
              files: [],
              name: entry.name,
              path: fullPath,
              type: "folder",
            });
            modifiedTimeTasks.push({ path: fullPath, index });
          } else if (FileTree.isVideoFile(entry.name)) {
            const index = rawEntries.length;
            rawEntries.push({
              name: entry.name,
              path: fullPath,
              type: "video",
            });
            modifiedTimeTasks.push({ path: fullPath, index });
            videoFileTasks.push({ path: fullPath, index });
          }
        }

        const { modifiedTimeResults, durationMap } = yield* Effect.all({
          modifiedTimeResults: readModifiedTimes(modifiedTimeTasks),
          durationMap:
            videoFileTasks.length > 0
              ? Effect.tryPromise({
                  try: async () =>
                    await workerPool.processFiles(
                      videoFileTasks.map((task) => task.path),
                      (filePath, error) => {
                        logger.error(`Error getting duration for ${filePath}`, error);
                      },
                    ),
                  catch: (error) => error,
                }).pipe(
                  Effect.catch((error) => {
                    logger.error("Error while processing directory video durations", error);
                    return Effect.succeed(new Map<string, number>());
                  }),
                )
              : Effect.succeed(new Map<string, number>()),
        });

        for (const result of modifiedTimeResults) {
          rawEntries[result.index].modifiedAtMs = result.modifiedAtMs;
        }

        for (let i = 0; i < videoFileTasks.length; i++) {
          rawEntries[videoFileTasks[i].index].duration =
            durationMap.get(videoFileTasks[i].path) ?? 0;
        }

        return {
          currentPath: resolvedPath,
          parentPath: isAtRoot ? null : parentPath,
          isAtRoot,
          files: FileTree.buildSortedFileTree(rawEntries, sortOptions),
        };
      }).pipe(
        Effect.catch((error) => {
          logger.error("Error loading directory contents", error);
          return Effect.fail(error);
        }),
      );

    const getAllVideoFilesRecursive = (
      folderPath: string,
    ): Effect.Effect<VideoFileItem[], unknown> =>
      Effect.gen(function* () {
        interface PendingVideo {
          name: string;
          path: string;
        }
        const pendingVideos: PendingVideo[] = [];

        const scan = (dirPath: string): Effect.Effect<void, unknown> =>
          Effect.gen(function* () {
            const dirEntries = yield* Effect.tryPromise({
              try: async () => await readdir(dirPath, { withFileTypes: true }),
              catch: (error) => error,
            });

            const subdirectories: string[] = [];

            for (const entry of dirEntries) {
              if (FileTree.isHidden(entry.name)) continue;

              const fullPath = FileTree.normalizePath(join(dirPath, entry.name));
              if (entry.isDirectory()) {
                subdirectories.push(fullPath);
              } else if (FileTree.isVideoFile(entry.name)) {
                pendingVideos.push({
                  name: entry.name,
                  path: fullPath,
                });
              }
            }

            if (subdirectories.length > 0) {
              yield* Effect.all(
                subdirectories.map((path) => scan(path)),
                {
                  concurrency: DIRECTORY_SCAN_CONCURRENCY,
                  discard: true,
                },
              );
            }
          });

        yield* scan(folderPath);

        if (pendingVideos.length === 0) {
          return [];
        }

        const durationMap = yield* Effect.tryPromise({
          try: async () =>
            await workerPool.processFiles(
              pendingVideos.map((video) => video.path),
              (filePath, error) => {
                logger.error(`Error getting duration for ${filePath}`, error);
              },
            ),
          catch: (error) => error,
        }).pipe(
          Effect.catch((error) => {
            logger.error("Error while processing recursive video durations", error);
            return Effect.succeed(new Map<string, number>());
          }),
        );

        return pendingVideos.map((video) => ({
          name: video.name,
          path: video.path,
          duration: durationMap.get(video.path) ?? 0,
        }));
      });

    const getVideoMetadata = (filePath: string): Effect.Effect<VideoMetadata, unknown> =>
      Effect.gen(function* () {
        yield* doFfmpegInit;

        const resolvedPath = FileTree.normalizePath(resolve(filePath));
        const fileStats = yield* Effect.tryPromise({
          try: async () => await stat(resolvedPath),
          catch: (error) => error,
        });

        const metadata: VideoMetadata = {
          file: {
            extension: extname(resolvedPath).replace(".", ""),
            modifiedAtMs: fileStats.mtimeMs,
            name: basename(resolvedPath),
            path: resolvedPath,
            sizeBytes: fileStats.size,
          },
        };

        const probeResult = yield* Effect.tryPromise({
          try: async () => {
            const { stdout } = (await execFileAsync(
              ffprobeInstaller.path,
              ["-v", "error", "-show_format", "-show_streams", "-of", "json", resolvedPath],
              {
                timeout: FFPROBE_TIMEOUT_MS,
                maxBuffer: 1024 * 1024,
              },
            )) as { stdout: string; stderr: string };

            return parseProbeOutput(stdout);
          },
          catch: (error) => error,
        }).pipe(
          Effect.map((probe) => ({ probe, success: true }) as const),
          Effect.catch((error) => {
            logger.error(`Error getting metadata for ${resolvedPath}`, error);
            return Effect.succeed({ error, success: false } as const);
          }),
        );

        if (!probeResult.success) {
          return {
            ...metadata,
            probeError:
              probeResult.error instanceof Error
                ? probeResult.error.message
                : String(probeResult.error),
          };
        }

        const format = isRecord(probeResult.probe.format) ? probeResult.probe.format : undefined;
        const videoStream = getStream(probeResult.probe.streams, "video");
        const audioStream = getStream(probeResult.probe.streams, "audio");

        const durationSeconds = getNumber(format, "duration");
        const formatBitrate = getNumber(format, "bit_rate");
        if (format || durationSeconds || formatBitrate) {
          metadata.format = {
            bitrateBitsPerSecond: formatBitrate,
            durationSeconds,
            formatName: getString(format, "format_name"),
          };
        }

        if (videoStream) {
          metadata.video = {
            bitrateBitsPerSecond: getNumber(videoStream, "bit_rate"),
            codecLongName: getString(videoStream, "codec_long_name"),
            codecName: getString(videoStream, "codec_name"),
            displayAspectRatio: getString(videoStream, "display_aspect_ratio"),
            frameRate: parseFrameRate(
              getString(videoStream, "avg_frame_rate") ?? getString(videoStream, "r_frame_rate"),
            ),
            height: getNumber(videoStream, "height"),
            width: getNumber(videoStream, "width"),
          };
        }

        if (audioStream) {
          metadata.audio = {
            bitrateBitsPerSecond: getNumber(audioStream, "bit_rate"),
            channelLayout: getString(audioStream, "channel_layout"),
            channels: getNumber(audioStream, "channels"),
            codecLongName: getString(audioStream, "codec_long_name"),
            codecName: getString(audioStream, "codec_name"),
            sampleRateHz: getNumber(audioStream, "sample_rate"),
          };
        }

        return metadata;
      });

    const showFilePicker = (
      mode: "both" | "file" | "folder",
      ownerWindow?: BrowserWindow | null,
    ): Effect.Effect<PickerResult | null, unknown> =>
      Effect.gen(function* () {
        const defaultPath = (yield* loadPreviousPath) ?? app.getPath("downloads");
        const properties: ("createDirectory" | "multiSelections" | "openDirectory" | "openFile")[] =
          [];

        if (mode === "file") {
          properties.push("openFile", "multiSelections");
        } else if (mode === "folder") {
          properties.push("openDirectory");
        } else {
          properties.push("openFile", "openDirectory", "multiSelections");
        }

        const options: OpenDialogOptions = {
          defaultPath,
          properties,
          title: `Select ${mode === "file" ? "File" : mode === "folder" ? "Folder" : "File or Folder"}`,
          message: `Select ${mode === "file" ? "a file" : mode === "folder" ? "a folder" : "a file or folder"} to open`,
        };

        if (mode === "file" || mode === "both") {
          options.filters = [
            { name: "Video Files", extensions: VIDEO_EXTENSIONS },
            { name: "All Files", extensions: ["*"] },
          ];
        }

        const browserWindow =
          ownerWindow && !ownerWindow.isDestroyed()
            ? ownerWindow
            : yield* windows.getOrCreateFocusedWindow;

        const result = yield* Effect.tryPromise({
          try: async () => await dialog.showOpenDialog(browserWindow, options),
          catch: (error) => error,
        });

        if (result.canceled || result.filePaths.length === 0) {
          return null;
        }

        const filePaths = result.filePaths;

        if (mode === "file") {
          yield* setPreviousPath(dirname(filePaths[0]));
          return {
            type: "file",
            path: FileTree.normalizePath(filePaths[0]),
          } as PickerResult;
        }

        const selectedPath = filePaths[0];
        const fileStats = yield* Effect.tryPromise({
          try: async () => await stat(selectedPath),
          catch: (error) => error,
        });

        if (fileStats.isFile()) {
          yield* setPreviousPath(dirname(selectedPath));
          return {
            type: "file",
            path: FileTree.normalizePath(selectedPath),
          } as PickerResult;
        }

        if (fileStats.isDirectory()) {
          yield* setPreviousPath(selectedPath);
          return yield* buildFileTree(selectedPath);
        }

        return null;
      }).pipe(
        Effect.catch((error) => {
          logger.error("Error showing file picker", error);
          return Effect.succeed(null);
        }),
      );

    const renameFileSystemItem = ({
      newName,
      path,
    }: RenameFileSystemItemInput): Effect.Effect<RenameFileSystemItemResult, unknown> =>
      Effect.tryPromise({
        try: async () => {
          const trimmedName = newName.trim();
          if (!trimmedName) {
            throw new Error("Name is required");
          }

          if (basename(trimmedName) !== trimmedName) {
            throw new Error("Name cannot include path separators");
          }

          const oldPath = FileTree.normalizePath(resolve(path));
          const newPath = FileTree.normalizePath(join(dirname(oldPath), trimmedName));

          if (newPath !== oldPath) {
            await rename(oldPath, newPath);
          }

          return {
            name: trimmedName,
            newPath,
            oldPath,
          };
        },
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) => {
          logger.error("Error renaming file system item", error);
          return Effect.fail(error);
        }),
      );

    return {
      showFilePicker,
      loadDirectoryContents,
      getAllVideoFilesRecursive,
      getVideoMetadata,
      renameFileSystemItem,
    } satisfies MediaService["Service"];
  }),
);
