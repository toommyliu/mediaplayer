import createLogger from "pino";

const IS_DEV = import.meta.env.MODE === "development";

export const logger = createLogger({
  level: IS_DEV ? "debug" : "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname"
    }
  },
  browser: {
    asObject: true
  }
});
