import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.expo/**",
      "**/coverage/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["**/*.cjs"], languageOptions: { sourceType: "commonjs" } },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/apps/**"],
              message: "Do not import another application.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/client/**/*.{ts,tsx}", "packages/contracts/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@clipscribe/backend",
            "@clipscribe/backend/*",
            "node:*",
            "**/packages/backend/**",
            "**/apps/api/**",
            "**/apps/worker/**",
          ],
        },
      ],
    },
  },
  {
    files: [
      "apps/*/src/**/*.ts",
      "apps/*/src/**/*.tsx",
      "packages/*/src/**/*.ts",
    ],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  prettier,
);
