import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import Icons from "unplugin-icons/vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
          fileWorker: resolve(__dirname, "src/main/worker/fileWorker.ts")
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "fileWorker") {
              return "worker/[name].js";
            }
            return "[name].js";
          }
        }
      }
    }
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
        $hooks: resolve("src/renderer/src/hooks/"),
        $shared: resolve("src/shared/")
      }
    }
  }
});
