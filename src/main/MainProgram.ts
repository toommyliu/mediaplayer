import { electronApp } from "@electron-toolkit/utils";
import { Context, Effect, Layer } from "effect";
import { app } from "electron";
import { Shutdown } from "./application/Shutdown";
import { MainLayer } from "./MainLayer";

export const MainProgram = Effect.gen(function* () {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

  yield* Effect.tryPromise(() => app.whenReady());
  electronApp.setAppUserModelId("com.electron");
  app.setAccessibilitySupportEnabled(true);

  yield* Effect.logInfo("Electron application ready");

  yield* Effect.scoped(
    Effect.gen(function* () {
      const services = yield* Layer.build(MainLayer);
      const shutdown = Context.get(services, Shutdown);
      yield* shutdown.await;
    }),
  );

  yield* Effect.logInfo("Main-process resources finalized");
  yield* Effect.sync(() => app.exit(0));
});
