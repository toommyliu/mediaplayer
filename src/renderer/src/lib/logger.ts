import { consola } from "consola";

if (import.meta.env.DEV) {
  consola.level = 4;
}

export const logger = consola.withTag("renderer");
