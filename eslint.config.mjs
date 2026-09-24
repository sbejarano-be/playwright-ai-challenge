import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'allure-results/', 'allure-report/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Las fixtures de Playwright exigen el patrón `async ({}, use) => ...`.
      'no-empty-pattern': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      'playwright/expect-expect': ['error', { assertFunctionNames: ['expectAI'] }],
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
    },
  },
]);
