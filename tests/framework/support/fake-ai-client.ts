import type { AiAvailability, AiClient, AiRequest, AiResponse } from '../../../src/ai/types';

/** IA simulada: devuelve respuestas predefinidas y registra cada petición. La última respuesta se repite. */
export class FakeAiClient implements AiClient {
  readonly provider = 'openai';
  readonly model = 'fake-model';
  readonly requests: AiRequest[] = [];
  private readonly replies: string[];

  constructor(...replies: string[]) {
    this.replies = replies;
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    this.requests.push(request);
    const text = (this.replies.length > 1 ? this.replies.shift() : this.replies[0]) ?? '';
    return { text, model: this.model, latencyMs: 1 };
  }
}

/** IA simulada cuyo proveedor rechaza todas las peticiones (clave inválida, modelo inexistente, sin saldo...). */
export class FailingAiClient implements AiClient {
  readonly provider = 'openai';
  readonly model = 'fake-model';

  constructor(private readonly error: Error) {}

  async complete(): Promise<AiResponse> {
    throw this.error;
  }
}

export function available(client: AiClient): AiAvailability {
  return { available: true, client };
}

export const unavailable: AiAvailability = { available: false, reason: 'IA deshabilitada en la prueba' };
