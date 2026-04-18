import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Block direct localStorage access for publishDraft keys: everything must
      // go through @/lib/draftStorage (enforces the autonex.* prefix and keeps
      // the phantom-UUID / TTL cleanup paths in one place).
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='localStorage'][callee.property.name=/^(getItem|setItem|removeItem)$/][arguments.0.value=/publishDraft/i]",
          message:
            "Direct localStorage access for publishDraft keys is forbidden. Use getDraft/setDraft/removeDraft from @/lib/draftStorage.",
        },
        {
          selector:
            "CallExpression[callee.object.property.name='localStorage'][callee.property.name=/^(getItem|setItem|removeItem)$/][arguments.0.value=/publishDraft/i]",
          message:
            "Direct window.localStorage access for publishDraft keys is forbidden. Use getDraft/setDraft/removeDraft from @/lib/draftStorage.",
        },
      ],
    },
  },
  // draftStorage.ts is the one module allowed to touch localStorage with
  // publishDraft keys — disable the guard just there.
  {
    files: ["src/lib/draftStorage.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
);
