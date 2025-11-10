import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: [
            "**/dist/**",
            "**/coverage/**",
            "**/node_modules/**",
            "**/out/**",
            "testdata/**",
            ".vscode-test/**",
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
    {
        // languageOptions: {
        //     parserOptions: {
        //         projectService: true,
        //     },
        // },
        rules: {
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
        },
    },
    eslintConfigPrettier,
];
