import { Context, Effect, Layer } from "effect";
import { shell } from "electron";
import { FileSystemError } from "../errors";

export interface DesktopShellShape {
  readonly reveal: (path: string) => Effect.Effect<void, FileSystemError>;
  readonly trash: (path: string) => Effect.Effect<void, FileSystemError>;
}

export class DesktopShell extends Context.Service<DesktopShell, DesktopShellShape>()(
  "mediaplayer/main/electron/DesktopShell",
) {
  static readonly layer = Layer.succeed(DesktopShell)({
    reveal: (path) =>
      Effect.try({
        try: () => shell.showItemInFolder(path),
        catch: (cause) => new FileSystemError({ cause, operation: "reveal", path }),
      }),
    trash: (path) =>
      Effect.tryPromise({
        try: () => shell.trashItem(path),
        catch: (cause) => new FileSystemError({ cause, operation: "trash", path }),
      }),
  });
}
