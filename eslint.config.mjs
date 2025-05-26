import {
  common,
  browser,
  node,
  typescript,
  sveltetypescript,
  edge,
  prettier
} from "eslint-config-neon";

export default [
  {
    ignore: ["**/dist/*"]
  },
  ...common,
  ...browser,
  ...node,
  ...typescript,
  ...sveltetypescript,
  ...edge,
  ...prettier,
  {
    settings: {
      react: {
        version: "detect"
      }
    },
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json"
      }
    }
  }
];
