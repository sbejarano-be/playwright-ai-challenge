import { defineConfig, devices } from '@playwright/test';
import { effectiveModel } from './src/ai/create-ai-client';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Sin reintentos: una prueba inestable debe verse en el reporte, no ocultarse.
  retries: 0,
  workers: process.env.CI ? 2 : 3,
  timeout: 90_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          'Base URL': env.BASE_URL,
          'Proveedor de IA': env.AI_PROVIDER,
          'Modelo de IA': effectiveModel(env) ?? '—',
          'Auto-reparación': env.HEALING_MODE,
          Node: process.version,
        },
        // Las categorías de fallas se definen en allurerc.mjs (configuración de Allure 3).
      },
    ],
    ['./src/reporting/healing-reporter.ts'],
  ],

  use: {
    baseURL: env.BASE_URL,
    testIdAttribute: 'data-qa',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    proxy: env.HTTPS_PROXY ? { server: env.HTTPS_PROXY } : undefined,
  },

  projects: [
    {
      // Criterio de entrada del ambiente: si la IA está configurada, el proveedor debe responder.
      // Ningún proyecto depende de este: un problema de ambiente no bloquea las pruebas del producto.
      name: 'environment',
      testDir: './tests/environment',
    },
    {
      // Pruebas del propio framework (IA simulada, sin red): validan la lógica de A, B y C.
      name: 'framework',
      testDir: './tests/framework',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Setup global: crea la cuenta por API, inicia sesión por UI y guarda el storageState.
      name: 'setup',
      testDir: './tests/setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'teardown',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'teardown',
      testDir: './tests/setup',
      testMatch: /.*\.teardown\.ts/,
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
