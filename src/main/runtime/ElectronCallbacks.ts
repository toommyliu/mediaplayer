import type { Effect as EffectType } from "effect";
import { Context, Effect, FiberSet, Layer } from "effect";

export interface ElectronCallbacksShape {
  readonly run: <A, E>(name: string, effect: EffectType.Effect<A, E>) => void;
  readonly runPromise: <A, E>(name: string, effect: EffectType.Effect<A, E>) => Promise<A>;
}

function observed<A, E>(name: string, effect: EffectType.Effect<A, E>) {
  return effect.pipe(
    Effect.tapCause((cause) => Effect.logError("Electron boundary failed", cause)),
    Effect.annotateLogs({
      boundary: "electron",
      callback: name,
    }),
    Effect.withSpan(name),
  );
}

export class ElectronCallbacks extends Context.Service<ElectronCallbacks, ElectronCallbacksShape>()(
  "mediaplayer/main/runtime/ElectronCallbacks",
) {
  static readonly layer = Layer.effect(
    ElectronCallbacks,
    Effect.gen(function* () {
      const runFork = yield* FiberSet.makeRuntime<never, unknown, unknown>();
      const runPromise = yield* FiberSet.makeRuntimePromise<never, unknown, unknown>();

      return ElectronCallbacks.of({
        run: (name, effect) => {
          runFork(observed(name, effect).pipe(Effect.catchCause(() => Effect.void)));
        },
        runPromise: (name, effect) => runPromise(observed(name, effect)),
      });
    }),
  );
}
