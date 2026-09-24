import { z } from 'zod';
import { postJson } from '../http';
import type { AiClient, AiRequest, AiResponse } from '../types';
import type { ProviderOptions } from './provider-options';

const ChatSchema = z.object({
  model: z.string(),
  message: z.object({ content: z.string() }),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
});

/** Modelo local con Ollama: permite ejecutar las pruebas de IA sin costo y sin clave. */
export class OllamaClient implements AiClient {
  readonly provider = 'ollama';

  constructor(private readonly options: ProviderOptions) {}

  get model(): string {
    return this.options.model;
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    const started = Date.now();
    const body = await postJson(
      `${this.options.baseUrl}/api/chat`,
      {
        model: this.options.model,
        stream: false,
        format: 'json',
        options: { temperature: request.temperature, num_predict: request.maxTokens },
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
      },
      {},
      this.options.timeoutMs,
    );
    const chat = ChatSchema.parse(body);
    return {
      text: chat.message.content,
      model: chat.model,
      latencyMs: Date.now() - started,
      inputTokens: chat.prompt_eval_count,
      outputTokens: chat.eval_count,
    };
  }
}
