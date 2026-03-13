import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

const globals = {
    alert: 'readonly',
    Blob: 'readonly',
    console: 'readonly',
    crypto: 'readonly',
    document: 'readonly',
    fetch: 'readonly',
    FileReader: 'readonly',
    FormData: 'readonly',
    Headers: 'readonly',
    localStorage: 'readonly',
    navigator: 'readonly',
    process: 'readonly',
    Request: 'readonly',
    Response: 'readonly',
    sessionStorage: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    TextEncoder: 'readonly',
    URL: 'readonly',
    window: 'readonly',
};

export default [
    {
        ignores: [
            '.next/**',
            'coverage/**',
            'dist/**',
            'out/**',
            'build/**',
            'node_modules/**',
            'content/posts/**',
            'docs/**',
        ],
    },
    js.configs.recommended,
    {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            'jsx-a11y': jsxA11yPlugin,
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            ...jsxA11yPlugin.configs.recommended.rules,
            'react-hooks/exhaustive-deps': 'off',
            'react-hooks/rules-of-hooks': 'off',
            'jsx-a11y/label-has-associated-control': 'off',
            'jsx-a11y/no-autofocus': 'off',
            'no-undef': 'off',
            'no-unused-vars': 'off',
            'react/jsx-no-comment-textnodes': 'off',
            'react/no-unescaped-entities': 'off',
            'react/no-unknown-property': 'off',
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
        },
    },
];
