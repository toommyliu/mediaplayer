import common from "eslint-config-neon/common";
import browser from "eslint-config-neon/browser";
import node from "eslint-config-neon/node";
import typescript from "eslint-config-neon/typescript";
import prettier from "eslint-config-neon/prettier";
import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.mjs";
import globals from "globals";

export default [
  {
    ignores: ["**/dist/*", "./**/*.js", "./**/*.mjs"]
  },
  ...common,
  ...browser,
  ...node,
  ...typescript,
  ...svelte.configs["flat/recommended"],
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  ...prettier,
  {
    files: [
      "src/renderer/**/*.ts",
      "src/renderer/**/*.svelte",
      "src/renderer/**/*.svelte.ts",
      "src/renderer/**/*.svelte.js"
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.web.json"
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "no-restricted-globals": "off"
    }
  },
  {
    files: ["src/main/**/*.ts", "src/preload/**/*.ts", "electron.vite.config.*"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.node.json"
      }
    }
  },
  {
    rules: {
      "require-atomic-updates": "off"
    }
  }
];
