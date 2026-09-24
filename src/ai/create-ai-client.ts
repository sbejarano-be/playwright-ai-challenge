import { z } from 'zod';
import { env, type Env } from '../config/env';
import { isReachable } from './http';
import { completeJson } from './json-completion';
import { AnthropicClient } from './providers/anthropic-client';
import { GeminiClient } from './providers/gemini-client';
import { OllamaClient } from './providers/ollama-client';
import { OpenAiClient } from './providers/openai-client';
import type { AiAvailability, AiClient, AiProviderName, AiRequest } from './types';

const DEFAULTS: Record<AiProviderName, { model: string; baseUrl: string }> = {
  openai: { model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1' },
  anthropic: { model: 'claude-haiku-4-5', baseUrl: 'https://api.anthropic.com' },
  gemini: { model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' },
  ollama: { model: 'llama3.1', baseUrl: 'http://localhost:11434' },
};

/** Petición mínima que recorre el mismo camino que las pruebas: clave, modelo, parámetros y modo JSON. */
const PREFLIGHT_REQUEST: AiRequest = {
  purpose: 'verificación del proveedor',
  system: 'Eres una verificación de conectividad. Responde solo con JSON.',
  prompt: 'Responde exactamente con este JSON: {"ok": true}',
  temperature: 0,
  maxTokens: 64,
};

/** Modelo que se usará: el configurado o el valor por defecto del proveedor; sin proveedor, ninguno. */
export function effectiveModel(config: Env = env): string | undefined {
  return config.AI_PROVIDER === 'none' ? undefined : (config.AI_MODEL ?? DEFAULTS[config.AI_PROVIDER].model);
}

/** La IA está configurada si hay proveedor y, salvo con Ollama, una clave. */
export function isAiConfigured(config: Env = env): boolean {
  return config.AI_PROVIDER === 'ollama' || (config.AI_PROVIDER !== 'none' && Boolean(config.AI_API_KEY));
}

/** Crea el cliente del proveedor configurado y lo verifica; si no está disponible, explica por qué. */
export async function detectAi(config: Env = env): Promise<AiAvailability> {
  const created = await createClient(config);
  return created.available ? verifyAi(created.client) : created;
}

/**
 * Verificación previa del proveedor. Si falla (clave inválida, modelo inexistente, sin saldo, parámetros no
 * admitidos), la IA se trata como no disponible: sus pruebas se omiten con el motivo y la prueba de ambiente falla.
 * El aviso se inyecta para que las pruebas que simulan fallos no lo impriman en el log como si fuera real.
 */
export async function verifyAi(
  client: AiClient,
  warn: (message: string) => void = console.warn,
): Promise<AiAvailability> {
  try {
    await completeJson(client, PREFLIGHT_REQUEST, z.record(z.string(), z.unknown()));
    return { available: true, client };
  } catch (error) {
    const detail = (error instanceof Error ? error.message : String(error)).replace('[AMBIENTE] ', '');
    const reason = `el proveedor ${client.provider} (modelo ${client.model}) no responde correctamente: ${detail}`;
    warn(`[AMBIENTE] IA configurada pero no disponible: ${reason}`);
    return { available: false, reason };
  }
}

async function createClient(config: Env): Promise<AiAvailability> {
  if (config.AI_PROVIDER === 'none') {
    return { available: false, reason: 'AI_PROVIDER no está configurado' };
  }
  const provider = config.AI_PROVIDER;
  const options = {
    apiKey: config.AI_API_KEY,
    model: config.AI_MODEL ?? DEFAULTS[provider].model,
    baseUrl: (config.AI_BASE_URL ?? DEFAULTS[provider].baseUrl).replace(/\/$/, ''),
    timeoutMs: config.AI_TIMEOUT_MS,
  };
  switch (provider) {
    case 'openai':
      return options.apiKey
        ? { available: true, client: new OpenAiClient(options) }
        : { available: false, reason: 'AI_API_KEY está vacío para el proveedor openai' };
    case 'anthropic':
      return options.apiKey
        ? { available: true, client: new AnthropicClient(options) }
        : { available: false, reason: 'AI_API_KEY está vacío para el proveedor anthropic' };
    case 'gemini':
      return options.apiKey
        ? { available: true, client: new GeminiClient(options) }
        : { available: false, reason: 'AI_API_KEY está vacío para el proveedor gemini' };
    case 'ollama':
      return (await isReachable(`${options.baseUrl}/api/tags`))
        ? { available: true, client: new OllamaClient(options) }
        : { available: false, reason: `Ollama no responde en ${options.baseUrl}` };
  }
}
