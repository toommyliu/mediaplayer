import { Effect } from "effect";
import { app } from "electron";
import { MainProgram } from "./MainProgram";
import { LoggingLayer } from "./observability/Logging";

Effect.runFork(
  MainProgram.pipe(
    Effect.catchCause((cause) =>
      Effect.logFatal("Main process terminated unexpectedly", cause).pipe(
        Effect.andThen(Effect.sync(() => app.exit(1))),
      ),
    ),
    Effect.provide(LoggingLayer),
  ),
);
