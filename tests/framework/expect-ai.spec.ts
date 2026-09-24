import { expect, test } from '@playwright/test';
import { AI_NOT_RUN, createExpectAI } from '../../src/assertions/expect-ai';
import { available, FakeAiClient, unavailable } from './support/fake-ai-client';

const THRESHOLD = 0.8;

function verdict(value: 'pass' | 'fail', confidence: number): string {
  return JSON.stringify({ verdict: value, confidence, reasoning: 'veredicto simulado' });
}

test.describe('expectAI', () => {
  test('aprueba cuando la IA confirma la intención con confianza suficiente', async ({}, testInfo) => {
    const fake = new FakeAiClient(verdict('pass', 0.93));

    await createExpectAI(available(fake), testInfo, THRESHOLD)('Thank you for your review.', 'Agradece la reseña');

    expect(fake.requests[0]?.temperature).toBe(0);
    expect(fake.requests[0]?.prompt).toContain('Thank you for your review.');
  });

  test('falla cuando la confianza está por debajo del umbral', async ({}, testInfo) => {
    const expectAI = createExpectAI(available(new FakeAiClient(verdict('pass', 0.55))), testInfo, THRESHOLD);

    await expect(expectAI('Texto', 'Intención')).rejects.toThrow(/no cumple la intención/);
  });

  test('falla cuando la IA juzga que el texto no cumple la intención', async ({}, testInfo) => {
    const expectAI = createExpectAI(available(new FakeAiClient(verdict('fail', 0.95))), testInfo, THRESHOLD);

    await expect(expectAI('Tu reseña fue rechazada.', 'Agradece la reseña')).rejects.toThrow(/Veredicto: fail/);
  });

  test('un texto vacío falla sin consultar a la IA', async ({}, testInfo) => {
    const fake = new FakeAiClient(verdict('pass', 1));

    await expect(createExpectAI(available(fake), testInfo, THRESHOLD)('   ', 'Intención')).rejects.toThrow(/vacío/);
    expect(fake.requests).toHaveLength(0);
  });

  test('verifica los fragmentos obligatorios antes de consultar a la IA', async ({}, testInfo) => {
    const fake = new FakeAiClient(verdict('pass', 1));
    const expectAI = createExpectAI(available(fake), testInfo, THRESHOLD);

    await expect(expectAI('Pedido confirmado', 'Confirma el pedido', { mustInclude: ['#1234'] })).rejects.toThrow(
      /#1234/,
    );
    expect(fake.requests).toHaveLength(0);
  });

  test('sin IA, anota la aserción semántica como no ejecutada y conserva las verificaciones deterministas', async ({}, testInfo) => {
    await createExpectAI(unavailable, testInfo, THRESHOLD)('Texto', 'Intención');

    expect(testInfo.annotations.map((annotation) => annotation.type)).toContain(AI_NOT_RUN);
  });
});
