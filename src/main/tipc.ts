import { tipc } from "@egoist/tipc/main";
import { platform } from "@electron-toolkit/utils";
import { showFilePicker } from "./utils";

const t = tipc.create();

export const router = {
  sum: t.procedure.input<{ a: number; b: number }>().action(async ({ input }) => {
    return input.a + input.b;
  }),

  selectFile: t.procedure.action(async () => {
    return await showFilePicker("file");
  }),
  selectFolder: t.procedure.action(async () => {
    return await showFilePicker("folder");
  }),
  selectFileOrFolder: t.procedure.action(async () => {
    return await showFilePicker("both");
  }),

  getPlatform: t.procedure.action(async () => platform)
};

export type Router = typeof router;
