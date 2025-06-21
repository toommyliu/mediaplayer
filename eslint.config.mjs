import common from "eslint-config-neon/common";
import browser from "eslint-config-neon/browser";
import node from "eslint-config-neon/node";
import typescript from "eslint-config-neon/typescript";
import prettier from "eslint-config-neon/prettier";
import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.mjs";

export default [
  {
    ignores: ["**/dist/*", "./**/*.js", "./**/*.mjs"]
  },
  ...common,
  ...browser,
  ...node,
  ...typescript,
  ...svelte.configs["flat/all"],
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig
      }
    }
  },
  ...prettier,
  {
    files: ["src/renderer/**/*.ts", "src/renderer/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.web.json"
      }
    }
  },
  {
    files: ["src/main/**/*.ts", "src/preload/**/*.ts", "electron.vite.config.*"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.node.json"
      }
    }
  }
];
