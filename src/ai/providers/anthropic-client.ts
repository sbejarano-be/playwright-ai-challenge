import { z } from 'zod';
import { postJson } from '../http';
import type { AiClient, AiRequest, AiResponse } from '../types';
import type { ProviderOptions } from './provider-options';

const MessageSchema = z.object({
  model: z.string(),
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).optional(),
});

/** Messages API de Anthropic. */
export class AnthropicClient implements AiClient {
  readonly provider = 'anthropic';

  constructor(private readonly options: ProviderOptions) {}

  get model(): string {
    return this.options.model;
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    const started = Date.now();
    const body = await postJson(
      `${this.options.baseUrl}/v1/messages`,
      {
        model: this.options.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
      },
      { 'x-api-key': this.options.apiKey ?? '', 'anthropic-version': '2023-06-01' },
      this.options.timeoutMs,
    );
    const message = MessageSchema.parse(body);
    return {
      text: message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join(''),
      model: message.model,
      latencyMs: Date.now() - started,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
    };
  }
}
