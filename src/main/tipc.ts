import { tipc } from "@egoist/tipc/main";
import { platform } from "@electron-toolkit/utils";
import { showFilePicker } from "./utils";
import { shell } from "electron";

const t = tipc.create();

export const router = {
  selectFile: t.procedure.action(async () => {
    return await showFilePicker("file");
  }),
  selectFolder: t.procedure.action(async () => {
    return await showFilePicker("folder");
  }),
  selectFileOrFolder: t.procedure.action(async () => {
    return await showFilePicker("both");
  }),

  showItemInFolder: t.procedure.input<string>().action(async ({ input }) => {
    try {
      shell.showItemInFolder(input);
    } catch {}
  }),

  getPlatform: t.procedure.action(async () => platform)
};

export type Router = typeof router;
