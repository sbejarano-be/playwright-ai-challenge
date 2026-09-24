import { isAiConfigured } from '../../src/ai/create-ai-client';
import { env } from '../../src/config/env';
import { expect, test } from '../../src/fixtures/test';

/**
 * Criterio de entrada del ambiente: si la IA está configurada, el proveedor debe responder.
 * Un fallo aquí es un problema de ambiente, no un defecto del producto: las pruebas que necesitan IA
 * se omiten con este mismo motivo en lugar de fallar.
 */
test('el proveedor de IA configurado responde', async ({ ai }) => {
  test.skip(!isAiConfigured(env), 'La IA no está configurada: las pruebas que la necesitan se omiten con el motivo');

  expect(ai, '[AMBIENTE] el proveedor de IA configurado debe responder').toMatchObject({ available: true });
});
