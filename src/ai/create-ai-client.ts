import { env, type Env } from '../config/env';
import { isReachable } from './http';
import { AnthropicClient } from './providers/anthropic-client';
import { OllamaClient } from './providers/ollama-client';
import { OpenAiClient } from './providers/openai-client';
import type { AiAvailability, AiProviderName } from './types';

const DEFAULTS: Record<AiProviderName, { model: string; baseUrl: string }> = {
  openai: { model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1' },
  anthropic: { model: 'claude-haiku-4-5', baseUrl: 'https://api.anthropic.com' },
  ollama: { model: 'llama3.1', baseUrl: 'http://localhost:11434' },
};

/** Crea el cliente del proveedor configurado o explica por qué la IA no está disponible. */
export async function detectAi(config: Env = env): Promise<AiAvailability> {
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
    case 'ollama':
      return (await isReachable(`${options.baseUrl}/api/tags`))
        ? { available: true, client: new OllamaClient(options) }
        : { available: false, reason: `Ollama no responde en ${options.baseUrl}` };
  }
}
