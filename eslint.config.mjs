import antfu from "@antfu/eslint-config";

export default antfu({
  formatters: true,
  stylistic: {
    quotes: "double",
    semi: true,
    overrides: {
      "style/comma-dangle": ["error", "only-multiline"],
    },
  },
  react: {
    reactCompiler: true,
  },
});
