// Règles de lint du dépôt. Zéro avertissement toléré (voir le script "lint").
import js from "@eslint/js";
import tseslint from "typescript-eslint";

const INTERDIT_DANS_CORE =
  "Interdit dans le moteur : il doit rester pur et déterministe. Passe le temps et la graine en paramètre (voir packages/core/CLAUDE.md).";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.cjs",
      "*.config.js",
      "*.config.ts",
      "supabase/**",
      // Fichiers servis tels quels (icônes, programme de mise en réserve) : ni TypeScript ni build.
      "packages/client/public/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-console": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    files: ["packages/core/src/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...[
          "Date",
          "performance",
          "fetch",
          "setTimeout",
          "setInterval",
          "window",
          "document",
          "process",
          "crypto",
          "localStorage",
        ].map((name) => ({ name, message: INTERDIT_DANS_CORE })),
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: INTERDIT_DANS_CORE },
      ],
    },
  },
);
