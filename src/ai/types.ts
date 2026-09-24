export type AiProviderName = 'openai' | 'anthropic' | 'gemini' | 'ollama';

export interface AiRequest {
  /** Para qué se usa la llamada; da nombre al adjunto del reporte. */
  purpose: string;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
}

export interface AiResponse {
  text: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

/** Contrato común de los proveedores (patrón Strategy): las pruebas no dependen de un proveedor concreto. */
export interface AiClient {
  readonly provider: AiProviderName;
  readonly model: string;
  complete(request: AiRequest): Promise<AiResponse>;
}

export type AiAvailability = { available: true; client: AiClient } | { available: false; reason: string };
