import type { TestInfo } from '@playwright/test';
import type { AiClient, AiProviderName, AiRequest, AiResponse } from './types';

/** Decorador que adjunta al reporte cada prompt y cada respuesta de la IA: toda decisión de la IA queda auditable. */
export class AuditedAiClient implements AiClient {
  private calls = 0;

  constructor(
    private readonly inner: AiClient,
    private readonly testInfo: TestInfo,
  ) {}

  get provider(): AiProviderName {
    return this.inner.provider;
  }

  get model(): string {
    return this.inner.model;
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    const call = ++this.calls;
    const started = Date.now();
    try {
      const response = await this.inner.complete(request);
      await this.attach(call, request, { response });
      return response;
    } catch (error) {
      await this.attach(call, request, { error: String(error), latencyMs: Date.now() - started });
      throw error;
    }
  }

  private async attach(call: number, request: AiRequest, outcome: object): Promise<void> {
    await this.testInfo.attach(`IA ${call} · ${request.purpose}`, {
      contentType: 'application/json',
      body: JSON.stringify({ provider: this.provider, model: this.model, ...request, ...outcome }, null, 2),
    });
  }
}
