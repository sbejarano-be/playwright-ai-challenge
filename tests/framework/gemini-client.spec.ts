import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';
import { AiProviderError } from '../../src/ai/errors';
import { GeminiClient } from '../../src/ai/providers/gemini-client';
import type { AiRequest } from '../../src/ai/types';

interface CapturedRequest {
  url: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

/** Respuesta con la forma documentada de `generateContent`, incluida una parte de razonamiento. */
const GENERATE_CONTENT_RESPONSE = {
  candidates: [
    {
      content: { parts: [{ text: 'razonamiento interno', thought: true }, { text: '{"verdict": "pass"}' }] },
      finishReason: 'STOP',
    },
  ],
  usageMetadata: { promptTokenCount: 42, candidatesTokenCount: 7, thoughtsTokenCount: 120 },
  modelVersion: 'gemini-3.8-flash',
};

const REQUEST: AiRequest = {
  purpose: 'prueba',
  system: 'Responde solo con JSON.',
  prompt: 'Evalúa el texto.',
  temperature: 0,
  maxTokens: 300,
};

/** Servidor local que registra la petición y responde como la API de Gemini. */
async function fakeGeminiApi(status: number, response: unknown) {
  const captured: CapturedRequest[] = [];
  const server: Server = createServer((request, reply) => {
    let raw = '';
    request.on('data', (chunk: Buffer) => (raw += chunk.toString()));
    request.on('end', () => {
      captured.push({ url: request.url ?? '', headers: request.headers, body: JSON.parse(raw) });
      reply.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(response));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { baseUrl, captured, close: () => new Promise((resolve) => server.close(resolve)) };
}

function clientFor(baseUrl: string, model: string): GeminiClient {
  return new GeminiClient({ apiKey: 'clave-de-prueba', model, baseUrl, timeoutMs: 5_000 });
}

test.describe('Cliente nativo de Gemini', () => {
  test('con Gemini 3 usa modo JSON y razonamiento LOW, sin temperatura, y omite las partes de razonamiento', async () => {
    const api = await fakeGeminiApi(200, GENERATE_CONTENT_RESPONSE);

    const response = await clientFor(api.baseUrl, 'gemini-3.8-flash').complete(REQUEST);
    await api.close();

    const sent = api.captured[0];
    expect(sent?.url).toBe('/v1beta/models/gemini-3.8-flash:generateContent');
    expect(sent?.headers['x-goog-api-key']).toBe('clave-de-prueba');
    expect(sent?.body).toMatchObject({
      systemInstruction: { parts: [{ text: 'Responde solo con JSON.' }] },
      contents: [{ role: 'user', parts: [{ text: 'Evalúa el texto.' }] }],
      generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' } },
    });
    expect(sent?.body.generationConfig).not.toHaveProperty('temperature');
    expect(response).toMatchObject({ text: '{"verdict": "pass"}', inputTokens: 42, outputTokens: 7 });
  });

  test('con modelos anteriores a Gemini 3 envía la temperatura y no usa thinkingLevel', async () => {
    const api = await fakeGeminiApi(200, GENERATE_CONTENT_RESPONSE);

    await clientFor(api.baseUrl, 'gemini-2.5-flash').complete(REQUEST);
    await api.close();

    const config = api.captured[0]?.body.generationConfig;
    expect(config).toMatchObject({ temperature: 0 });
    expect(config).not.toHaveProperty('thinkingConfig');
  });

  test('un error de la API se reporta como problema de ambiente con el mensaje de Google', async () => {
    const api = await fakeGeminiApi(400, {
      error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' },
    });

    const call = clientFor(api.baseUrl, 'gemini-3.8-flash').complete(REQUEST);

    await expect(call).rejects.toThrow(AiProviderError);
    await expect(call).rejects.toThrow(/\[AMBIENTE\].*respondió 400.*API key not valid/);
    await api.close();
  });
});
