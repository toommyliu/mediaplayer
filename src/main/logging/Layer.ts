import process from "node:process";
import { createConsola, LogLevels } from "consola";
import { Layer } from "effect";
import { LoggerService } from "./Service";

function callLog(
  fn: (message: any, ...args: any[]) => void,
  args: unknown[],
): void {
  if (args.length === 0) return;
  const [message, ...rest] = args;
  fn(message, ...rest);
}

export const LoggerLayer = Layer.sync(LoggerService)(() => {
  const logger = createConsola({
    level:
      process.env.NODE_ENV === "production" ? LogLevels.info : LogLevels.debug,
  });

  return {
    debug: (...args: unknown[]) => {
      callLog(logger.debug, args);
    },
    info: (...args: unknown[]) => {
      callLog(logger.info, args);
    },
    warn: (...args: unknown[]) => {
      callLog(logger.warn, args);
    },
    error: (...args: unknown[]) => {
      callLog(logger.error, args);
    },
  };
});
