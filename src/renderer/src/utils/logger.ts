// import createLogger from "pino";

// const IS_DEV = import.meta.env.MODE === "development";

// export const logger = createLogger({
//   level: IS_DEV ? "debug" : "info",
//   browser: {
//     write: (obj: any) => {
//       const level =
//         obj.level >= 50 ? "ERROR" : obj.level >= 40 ? "WARN" : obj.level >= 30 ? "INFO" : "DEBUG";
//       const time = new Date(obj.time).toLocaleString();
//       console.log(`[${level}] ${time} - ${obj.msg}`);
//     }
//   }
// });
import { createConsola } from "consola";

export const logger = createConsola({
  level: import.meta.env.MODE === "development" ? 4 : 3
});
