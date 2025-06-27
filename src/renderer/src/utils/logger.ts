import { createConsola, LogLevels } from "consola";

export const logger = createConsola({
  level: import.meta.env.MODE === "development" ? LogLevels.debug : LogLevels.info
});
