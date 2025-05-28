import { tipc } from "@egoist/tipc/main";
import { platform } from "@electron-toolkit/utils";
const t = tipc.create();

export const router = {
  sum: t.procedure.input<{ a: number; b: number }>().action(async ({ input }) => {
    return input.a + input.b;
  }),

  getPlatform: t.procedure.action(async () => platform)
};

export type Router = typeof router;
