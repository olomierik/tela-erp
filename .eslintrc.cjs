const globals = require("globals");
const tseslint = require("typescript-eslint");
const eslintPluginReact = require("eslint-plugin-react");
const eslintPluginReactHooks = require("eslint-plugin-react-hooks");
const eslintPluginReactRefresh = require("eslint-plugin-react-refresh");

module.exports = [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: eslintPluginReact,
      "react-hooks": eslintPluginReactHooks,
      "react-refresh": eslintPluginReactRefresh,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // Base ESLint recommended rules
      ...require("@eslint/js").configs.recommended.rules,
      // TypeScript ESLint recommended rules
      ...tseslint.configs.recommended.rules,
      // React recommended rules
      ...eslintPluginReact.configs.recommended.rules,
      // React Hooks recommended rules
      ...eslintPluginReactHooks.configs.recommended.rules,
      // React Refresh rules
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "off", // Temporarily disable to reduce noise
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "off", // Allow require() for CJS config files
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    ignores: ["dist", ".eslintrc.cjs", "vite.config.ts", "vite.desktop.config.ts"],
  },
];
