import type { OpenDialogOptions } from "electron";
import type { FileTreeItem, SortOptions } from "../../shared";
import type {
  DirectoryContents,
  PickerResult,
  VideoFileItem,
} from "../../shared/contracts";
import { chmod, readdir, stat } from "node:fs/promises";
import { cpus } from "node:os";
import { dirname, join, resolve } from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { Effect, Layer } from "effect";
import { app, BrowserWindow, dialog } from "electron";
import { DEFAULT_SORT_OPTIONS, VIDEO_EXTENSIONS } from "../../shared/constants";
import { LoggerService } from "../logging/Service";
import { FileTree } from "./FileTree";
import { MediaService } from "./Service";
import fileWorkerPath from "./worker/FileWorker?modulePath";
import { WorkerPool } from "./worker/WorkerPool";

const CPU_COUNT = cpus().length;
const WORKER_POOL_SIZE = Math.max(2, Math.min(8, CPU_COUNT));
const DIRECTORY_SCAN_CONCURRENCY = Math.max(2, Math.min(16, CPU_COUNT * 2));

export const MediaLayer = Layer.effect(
  MediaService,
  Effect.gen(function* () {
    const logger = yield* LoggerService;

    let previousPath: string | null = null;
    let isFfmpegInitialized = false;

    const workerPool = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: async () => {
          const pool = new WorkerPool(WORKER_POOL_SIZE, fileWorkerPath, {
            cacheMaxEntries: 20_000,
            cacheTtlMs: 15 * 60 * 1000,
          });
          await pool.initialize();
          logger.debug(
            `media worker pool initialized with ${WORKER_POOL_SIZE} workers`,
          );
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
            logger.debug(
              "ffprobe does not have execute permissions, fixing...",
            );
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
          name: string;
          path: string;
          type: "folder" | "video";
        }[] = [];

        const videoFileTasks: { path: string; index: number }[] = [];
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
            const subDirPath = FileTree.normalizePath(
              join(dirPath, entry.name),
            );
            const index = entries.length;

            entries.push({
              path: subDirPath,
              name: entry.name,
              type: "folder",
              files: [],
            });

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
                path: filePath,
                name: entry.name,
                type: "video",
              });
              videoFileTasks.push({ path: filePath, index });
            }
          }
        }

        const { subdirectoryResults, durationMap } = yield* Effect.all({
          subdirectoryResults: Effect.all(
            subdirectoryTasks.map((task) =>
              task.effect.pipe(
                Effect.catch((error) => {
                  logger.error(
                    `Error processing subdirectory ${task.path}`,
                    error,
                  );
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
                        logger.error(
                          `Error getting duration for ${filePath}`,
                          error,
                        );
                      },
                    ),
                  catch: (error) => error,
                }).pipe(
                  Effect.catch((error) => {
                    logger.error(
                      "Error while processing video durations",
                      error,
                    );
                    return Effect.succeed(new Map<string, number>());
                  }),
                )
              : Effect.succeed(new Map<string, number>()),
        });

        for (let i = 0; i < subdirectoryTasks.length; i++) {
          const result = subdirectoryResults[i];
          entries[subdirectoryTasks[i].index].files =
            result.type === "folder" ? result.tree : [];
        }

        for (let i = 0; i < videoFileTasks.length; i++) {
          entries[videoFileTasks[i].index].duration =
            durationMap.get(videoFileTasks[i].path) ?? 0;
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
          name: string;
          path: string;
          type: "folder" | "video";
        }[] = [];

        const videoFileTasks: { path: string; index: number }[] = [];

        for (const entry of entries) {
          if (FileTree.isHidden(entry.name)) continue;

          const fullPath = FileTree.normalizePath(
            join(resolvedPath, entry.name),
          );

          if (entry.isDirectory()) {
            rawEntries.push({
              name: entry.name,
              path: fullPath,
              type: "folder",
              files: [],
            });
          } else if (FileTree.isVideoFile(entry.name)) {
            const index = rawEntries.length;
            rawEntries.push({
              name: entry.name,
              path: fullPath,
              type: "video",
            });
            videoFileTasks.push({ path: fullPath, index });
          }
        }

        if (videoFileTasks.length > 0) {
          const durationMap = yield* Effect.tryPromise({
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
              logger.error(
                "Error while processing directory video durations",
                error,
              );
              return Effect.succeed(new Map<string, number>());
            }),
          );

          for (let i = 0; i < videoFileTasks.length; i++) {
            rawEntries[videoFileTasks[i].index].duration =
              durationMap.get(videoFileTasks[i].path) ?? 0;
          }
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

              const fullPath = FileTree.normalizePath(
                join(dirPath, entry.name),
              );
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
            logger.error(
              "Error while processing recursive video durations",
              error,
            );
            return Effect.succeed(new Map<string, number>());
          }),
        );

        return pendingVideos.map((video) => ({
          name: video.name,
          path: video.path,
          duration: durationMap.get(video.path) ?? 0,
        }));
      });

    const showFilePicker = (
      mode: "both" | "file" | "folder",
    ): Effect.Effect<PickerResult | null, unknown> =>
      Effect.gen(function* () {
        const properties: (
          | "createDirectory"
          | "multiSelections"
          | "openDirectory"
          | "openFile"
        )[] = [];

        if (mode === "file") {
          properties.push("openFile", "multiSelections");
        } else if (mode === "folder") {
          properties.push("openDirectory");
        } else {
          properties.push("openFile", "openDirectory", "multiSelections");
        }

        const options: OpenDialogOptions = {
          defaultPath: previousPath ?? app.getPath("downloads"),
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

        const filePaths = dialog.showOpenDialogSync(
          BrowserWindow.getFocusedWindow()!,
          options,
        );
        if (!filePaths || filePaths.length === 0) {
          return null;
        }

        if (mode === "file") {
          previousPath = dirname(filePaths[0]);
          logger.debug(`previousPath set to: ${previousPath}`);
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
          previousPath = dirname(selectedPath);
          logger.debug(`previousPath set to: ${previousPath}`);
          return {
            type: "file",
            path: FileTree.normalizePath(selectedPath),
          } as PickerResult;
        }

        if (fileStats.isDirectory()) {
          previousPath = selectedPath;
          logger.debug(`previousPath set to: ${previousPath}`);
          return yield* buildFileTree(selectedPath);
        }

        return null;
      }).pipe(
        Effect.catch((error) => {
          logger.error("Error showing file picker", error);
          return Effect.succeed(null);
        }),
      );

    return {
      showFilePicker,
      loadDirectoryContents,
      getAllVideoFilesRecursive,
    } satisfies MediaService["Service"];
  }),
);
