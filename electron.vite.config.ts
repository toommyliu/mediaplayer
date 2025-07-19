import { resolve } from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import Icons from "unplugin-icons/vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [
      svelte(),
      Icons({
        compiler: "svelte"
      })
    ],
    resolve: {
      alias: {
        $components: resolve("src/renderer/src/components/"),
        $ui: resolve("src/renderer/src/components/ui/"),
        $main: resolve("src/main/"),
        $lib: resolve("src/renderer/src/lib/"),
        $: resolve("src/renderer/src/"),
        $hooks: resolve("src/renderer/src/hooks/")
      }
    }
  }
});
