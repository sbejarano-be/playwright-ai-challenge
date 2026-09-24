import { expect, test, type TestInfo } from '@playwright/test';
import type { AiAvailability } from '../ai/types';
import { SemanticJudge } from './semantic-judge';

export interface ExpectAiOptions {
  /** Fragmentos que el texto debe contener sí o sí: verificación determinista previa a la IA. */
  mustInclude?: string[];
  /** Confianza mínima; por defecto AI_ASSERT_THRESHOLD. */
  threshold?: number;
}

export type ExpectAI = (actualText: string, expectedIntent: string, options?: ExpectAiOptions) => Promise<void>;

export const AI_NOT_RUN = 'aserción semántica no ejecutada';

/**
 * Crea `expectAI(textoReal, intencionEsperada)`. Primero hace verificaciones deterministas y luego consulta a la IA:
 * la IA nunca es el único oráculo. Sin IA configurada, la aserción semántica queda anotada como no ejecutada
 * y la prueba conserva sus demás verificaciones.
 */
export function createExpectAI(ai: AiAvailability, testInfo: TestInfo, defaultThreshold: number): ExpectAI {
  return async (actualText, expectedIntent, options = {}) => {
    await test.step(`expectAI · ${expectedIntent}`, async () => {
      expect(actualText.trim(), 'El texto evaluado está vacío').not.toBe('');
      for (const fragment of options.mustInclude ?? []) {
        expect(actualText, `El texto debe incluir "${fragment}"`).toContain(fragment);
      }
      if (!ai.available) {
        testInfo.annotations.push({ type: AI_NOT_RUN, description: `${expectedIntent} (${ai.reason})` });
        return;
      }

      const threshold = options.threshold ?? defaultThreshold;
      const verdict = await new SemanticJudge(ai.client).evaluate(actualText, expectedIntent);
      const message = [
        'La IA considera que el texto no cumple la intención esperada.',
        `Intención: ${expectedIntent}`,
        `Texto: ${actualText}`,
        `Veredicto: ${verdict.verdict} (confianza ${verdict.confidence}; mínimo ${threshold})`,
        `Razonamiento: ${verdict.reasoning}`,
      ].join('\n');
      expect(verdict.verdict === 'pass' && verdict.confidence >= threshold, message).toBe(true);
    });
  };
}
