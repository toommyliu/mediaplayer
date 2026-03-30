import { Effect } from "effect";
import { MainLayer } from "./MainLayer";
import { MainProgram } from "./MainProgram";

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
