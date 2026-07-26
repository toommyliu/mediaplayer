import type { BrowserWindow, OpenDialogOptions } from "electron";
import type { PickerResult } from "../../shared/contracts";
import { stat } from "node:fs/promises";
import { dirname } from "node:path";
import { Context, Effect, Layer, Ref } from "effect";
import { app, dialog } from "electron";
import { VIDEO_EXTENSIONS } from "../../shared/constants";
import { MediaLibrary } from "../media/MediaLibrary";
import { normalizePath } from "../media/FileTree";
import { parsePreviousDirectory } from "../media/PreviousDirectory";
import { PersistedStore } from "../persistence/PersistedStore";
import { WindowManager } from "./WindowManager";

const PREVIOUS_OPEN_DIRECTORY_STORE = "previous-open-directory";

export type PickerMode = "both" | "file" | "folder";

export interface MediaPickerShape {
  readonly show: (
    mode: PickerMode,
    owner?: BrowserWindow | null,
  ) => Effect.Effect<PickerResult | null>;
}

export class MediaPicker extends Context.Service<MediaPicker, MediaPickerShape>()(
  "mediaplayer/main/electron/MediaPicker",
) {
  static readonly layer = Layer.effect(
    MediaPicker,
    Effect.gen(function* () {
      const library = yield* MediaLibrary;
      const persistedStore = yield* PersistedStore;
      const windows = yield* WindowManager;
      const previousDirectory = yield* Ref.make<string | null>(null);

      const loadPreviousDirectory = Effect.fn("MediaPicker.loadPreviousDirectory")(function* () {
        const cached = yield* Ref.get(previousDirectory);
        if (cached) return cached;

        const stored = yield* persistedStore.read(PREVIOUS_OPEN_DIRECTORY_STORE);
        const parsed = parsePreviousDirectory(stored);
        if (parsed) yield* Ref.set(previousDirectory, parsed);
        return parsed;
      });

      const rememberDirectory = Effect.fn("MediaPicker.rememberDirectory")(function* (
        path: string,
      ) {
        const normalized = normalizePath(path);
        yield* Ref.set(previousDirectory, normalized);
        yield* persistedStore.write({
          name: PREVIOUS_OPEN_DIRECTORY_STORE,
          value: JSON.stringify({ path: normalized }),
        });
      });

      const show = Effect.fn("MediaPicker.show")(
        function* (mode: PickerMode, owner?: BrowserWindow | null) {
          const defaultPath = (yield* loadPreviousDirectory()) ?? app.getPath("downloads");
          const properties: OpenDialogOptions["properties"] = [];

          if (mode === "file") {
            properties.push("openFile", "multiSelections");
          } else if (mode === "folder") {
            properties.push("openDirectory");
          } else {
            properties.push("openFile", "openDirectory", "multiSelections");
          }

          const noun = mode === "file" ? "File" : mode === "folder" ? "Folder" : "File or Folder";
          const options: OpenDialogOptions = {
            defaultPath,
            properties,
            title: `Select ${noun}`,
            message: `Select ${noun.toLowerCase()} to open`,
            ...(mode === "folder"
              ? {}
              : {
                  filters: [
                    { name: "Video Files", extensions: VIDEO_EXTENSIONS },
                    { name: "All Files", extensions: ["*"] },
                  ],
                }),
          };

          const ownerWindow =
            owner && !owner.isDestroyed() ? owner : yield* windows.getOrCreateFocused;
          const result = yield* Effect.tryPromise(() =>
            dialog.showOpenDialog(ownerWindow, options),
          );
          if (result.canceled || result.filePaths.length === 0) return null;

          const selectedPath = result.filePaths[0];
          if (mode === "file") {
            yield* rememberDirectory(dirname(selectedPath));
            return { path: normalizePath(selectedPath), type: "file" } satisfies PickerResult;
          }

          const stats = yield* Effect.tryPromise(() => stat(selectedPath));
          if (stats.isFile()) {
            yield* rememberDirectory(dirname(selectedPath));
            return { path: normalizePath(selectedPath), type: "file" } satisfies PickerResult;
          }
          if (!stats.isDirectory()) return null;

          yield* rememberDirectory(selectedPath);
          return {
            rootPath: normalizePath(selectedPath),
            tree: yield* library.buildFileTree(selectedPath),
            type: "folder",
          } satisfies PickerResult;
        },
        Effect.catch((error) =>
          Effect.logError("File picker failed", error).pipe(
            Effect.annotateLogs({ service: "MediaPicker" }),
            Effect.as(null),
          ),
        ),
      );

      return MediaPicker.of({ show });
    }),
  );
}
