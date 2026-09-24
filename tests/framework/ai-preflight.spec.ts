import { expect, test } from '@playwright/test';
import { isAiConfigured, verifyAi } from '../../src/ai/create-ai-client';
import { AiProviderError } from '../../src/ai/errors';
import { env } from '../../src/config/env';
import { FailingAiClient, FakeAiClient } from './support/fake-ai-client';

test.describe('Verificación previa del proveedor de IA', () => {
  test('marca la IA como disponible cuando el proveedor responde JSON', async () => {
    const fake = new FakeAiClient('{"ok": true}');

    const availability = await verifyAi(fake);

    expect(availability.available).toBe(true);
    expect(fake.requests[0]?.temperature).toBe(0);
  });

  test('si el proveedor rechaza la petición, la IA queda no disponible con el mensaje del proveedor', async () => {
    const rejected = new FailingAiClient(
      new AiProviderError('[AMBIENTE] https://api.openai.com respondió 401: Incorrect API key provided'),
    );

    const availability = await verifyAi(rejected);

    expect(availability).toEqual({
      available: false,
      reason:
        'el proveedor openai (modelo fake-model) no responde correctamente: https://api.openai.com respondió 401: Incorrect API key provided',
    });
  });

  test('si el proveedor responde, pero nunca con JSON válido, la IA queda no disponible', async () => {
    const availability = await verifyAi(new FakeAiClient('lo siento, no puedo responder en JSON'));

    expect(availability.available).toBe(false);
  });

  test('la IA solo cuenta como configurada con proveedor y clave, salvo con Ollama', () => {
    expect(isAiConfigured({ ...env, AI_PROVIDER: 'none', AI_API_KEY: 'clave' })).toBe(false);
    expect(isAiConfigured({ ...env, AI_PROVIDER: 'openai', AI_API_KEY: undefined })).toBe(false);
    expect(isAiConfigured({ ...env, AI_PROVIDER: 'anthropic', AI_API_KEY: 'clave' })).toBe(true);
    expect(isAiConfigured({ ...env, AI_PROVIDER: 'ollama', AI_API_KEY: undefined })).toBe(true);
  });
});
