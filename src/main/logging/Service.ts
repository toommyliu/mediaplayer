import { ServiceMap } from "effect";

export interface LoggerServiceShape {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export class LoggerService extends ServiceMap.Service<
  LoggerService,
  LoggerServiceShape
>()("main/logging/LoggerService") {}
