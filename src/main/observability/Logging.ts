import process from "node:process";
import { Layer, Logger, References } from "effect";

const minimumLevel = process.env.NODE_ENV === "production" ? "Info" : "Debug";
const logger = process.env.NODE_ENV === "production" ? Logger.consoleJson : Logger.consoleLogFmt;

export const LoggingLayer = Layer.mergeAll(
  Logger.layer([logger]),
  Layer.succeed(References.MinimumLogLevel, minimumLevel),
);
