import { Context, Deferred, Effect, Layer } from "effect";

export interface ShutdownShape {
  readonly await: Effect.Effect<void>;
  readonly request: (reason: string) => Effect.Effect<void>;
}

export class Shutdown extends Context.Service<Shutdown, ShutdownShape>()(
  "mediaplayer/main/application/Shutdown",
) {
  static readonly layer = Layer.effect(
    Shutdown,
    Effect.gen(function* () {
      const signal = yield* Deferred.make<void>();

      return Shutdown.of({
        await: Deferred.await(signal),
        request: Effect.fn("Shutdown.request")(function* (reason: string) {
          yield* Effect.logInfo("Shutdown requested").pipe(Effect.annotateLogs({ reason }));
          yield* Deferred.succeed(signal, undefined).pipe(Effect.asVoid);
        }),
      });
    }),
  );
}
