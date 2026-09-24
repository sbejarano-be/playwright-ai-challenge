import { z } from 'zod';
import { postJson } from '../http';
import type { AiClient, AiRequest, AiResponse } from '../types';
import type { ProviderOptions } from './provider-options';

const ChatCompletionSchema = z.object({
  model: z.string(),
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).optional(),
});

/** Chat Completions de OpenAI. Con AI_BASE_URL también sirve para gateways compatibles. */
export class OpenAiClient implements AiClient {
  readonly provider = 'openai';

  constructor(private readonly options: ProviderOptions) {}

  get model(): string {
    return this.options.model;
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    const started = Date.now();
    const body = await postJson(
      `${this.options.baseUrl}/chat/completions`,
      {
        model: this.options.model,
        temperature: request.temperature,
        max_completion_tokens: request.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
      },
      { authorization: `Bearer ${this.options.apiKey}` },
      this.options.timeoutMs,
    );
    const completion = ChatCompletionSchema.parse(body);
    return {
      text: completion.choices[0]?.message.content ?? '',
      model: completion.model,
      latencyMs: Date.now() - started,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  }
}
