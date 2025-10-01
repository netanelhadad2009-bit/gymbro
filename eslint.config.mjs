import tseslint from "typescript-eslint";

/**
 * Flat config, lightweight (no type-aware rules).
 * We lint only source files, ignore build outputs.
 */
export default [
  // Ignore generated / vendor folders
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/.turbo/**", "**/build/**"],
  },

  // Base TS/TSX rules (no type-checking)
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        // do NOT require a tsconfig project here (keeps it simple)
        project: false,
      },
    },
    rules: {
      // Reasonable defaults for now
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
    },
  },
];
