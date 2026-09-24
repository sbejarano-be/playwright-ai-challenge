import { z } from 'zod';
import { postJson } from '../http';
import type { AiClient, AiRequest, AiResponse } from '../types';
import type { ProviderOptions } from './provider-options';

const GenerateContentSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  usageMetadata: z
    .object({ promptTokenCount: z.number().optional(), candidatesTokenCount: z.number().optional() })
    .optional(),
  modelVersion: z.string().optional(),
});

/** Margen para el razonamiento de Gemini 3: la documentación no aclara si cuenta dentro del límite de salida. */
const THINKING_ALLOWANCE_TOKENS = 2_048;

/**
 * API nativa de Gemini (`generateContent`). Con Gemini 3 o posterior no se envía temperatura, porque Google recomienda
 * mantener su valor por defecto, y el razonamiento se limita al nivel LOW, que admiten todos los modelos Gemini 3.
 */
export class GeminiClient implements AiClient {
  readonly provider = 'gemini';

  constructor(private readonly options: ProviderOptions) {}

  get model(): string {
    return this.options.model;
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    const started = Date.now();
    const body = await postJson(
      `${this.options.baseUrl}/v1beta/models/${encodeURIComponent(this.options.model)}:generateContent`,
      {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: this.generationConfig(request),
      },
      { 'x-goog-api-key': this.options.apiKey ?? '' },
      this.options.timeoutMs,
    );
    const response = GenerateContentSchema.parse(body);
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    return {
      text: parts
        .filter((part) => !part.thought)
        .map((part) => part.text ?? '')
        .join(''),
      model: response.modelVersion ?? this.options.model,
      latencyMs: Date.now() - started,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    };
  }

  private generationConfig(request: AiRequest): Record<string, unknown> {
    const common = {
      responseMimeType: 'application/json',
      maxOutputTokens: request.maxTokens + THINKING_ALLOWANCE_TOKENS,
    };
    return isGemini3OrLater(this.options.model)
      ? { ...common, thinkingConfig: { thinkingLevel: 'LOW' } }
      : { ...common, temperature: request.temperature };
  }
}

/** `thinkingLevel` solo existe desde Gemini 3; en modelos anteriores la API responde con error. */
function isGemini3OrLater(model: string): boolean {
  const major = /^gemini-(\d+)/.exec(model)?.[1];
  return major !== undefined && Number(major) >= 3;
}
