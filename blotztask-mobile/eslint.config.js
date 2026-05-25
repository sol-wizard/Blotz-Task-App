const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const expo = require("eslint-config-expo/flat");
const prettier = require("eslint-config-prettier");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = defineConfig([
  ...expo,

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      camelcase: "warn",
      quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
      // useSharedValue().value is designed to be mutated — the rule's type inference
      // incorrectly treats it as frozen in some patterns despite ReanimatedSharedValueId
      // being in the mutable types list.
      "react-hooks/immutability": "off",
    },
  },
  prettier,

  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "eslint.config.*",
      "metro.config.*",
      "tailwind.config.*",
      "babel.config.*",
    ],
  },
]);
