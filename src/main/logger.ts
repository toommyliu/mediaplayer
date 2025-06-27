import process from "node:process";
import { createConsola, LogLevels } from "consola";

export const logger = createConsola({
  level: process.env.NODE_ENV === "production" ? LogLevels.info : LogLevels.debug
});
