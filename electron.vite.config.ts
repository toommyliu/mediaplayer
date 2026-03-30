import { resolve } from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        "@": resolve("src/renderer/src"),
        "@stores": resolve("src/renderer/stores"),
      },
    },
    plugins: [
      react({}),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
  },
});
