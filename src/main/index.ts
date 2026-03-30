import { Effect } from "effect";
import { MainLayer } from "./app/MainLayer";
import { MainProgram } from "./app/MainProgram";

const program = Effect.scoped(MainProgram.pipe(Effect.provide(MainLayer)));

Effect.runFork(
  program.pipe(
    Effect.catch((error) =>
      Effect.sync(() => {
        console.error("Main process crashed", error);
      })
    )
  )
);
