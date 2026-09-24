import { writeFileSync } from 'node:fs';
import { expect, test, type TestInfo } from '@playwright/test';
import { passesLuhn, testPaymentCard } from '../../src/data/payment-card';
import { TEST_DATA, TestDataFactory } from '../../src/data/test-data-factory';
import { available, FakeAiClient, unavailable } from './support/fake-ai-client';

const CANADIAN_PROFILE = {
  title: 'Mrs',
  firstName: 'Chloé',
  lastName: 'Tremblay',
  company: 'Maple Analytics',
  address1: '350 Rue Sainte-Catherine O',
  address2: 'Bureau 402',
  country: 'Canada',
  state: 'Quebec',
  city: 'Montreal',
  zipcode: 'H3B 1A7',
  mobileNumber: '+1 514-555-0148',
  birthDate: { day: 14, month: 3, year: 1991 },
  deliveryInstructions: 'Dejar el paquete con el conserje del lobby.',
};

function descriptionsOf(testInfo: TestInfo): string[] {
  return testInfo.annotations
    .filter((annotation) => annotation.type === TEST_DATA)
    .map((annotation) => annotation.description ?? '');
}

test.describe('Datos sintéticos', () => {
  test('usa el perfil de la IA cuando cumple el formato del país', async ({}, testInfo) => {
    const fake = new FakeAiClient(JSON.stringify(CANADIAN_PROFILE));

    const data = await new TestDataFactory(available(fake), testInfo, undefined).registration('Canada');

    expect(data.zipcode).toBe('H3B 1A7');
    expect(data.email).toMatch(/^qa\..+@example\.com$/);
    expect(descriptionsOf(testInfo)).toContain('perfil de Canada generado por ia');
  });

  test('si la IA devuelve dos veces un código postal inválido para el país, usa Faker como respaldo', async ({}, testInfo) => {
    const fake = new FakeAiClient(JSON.stringify({ ...CANADIAN_PROFILE, zipcode: '12345' }));

    const data = await new TestDataFactory(available(fake), testInfo, undefined).registration('Canada');

    expect(fake.requests).toHaveLength(2);
    expect(data.country).toBe('United States');
    expect(descriptionsOf(testInfo)).toContain('perfil de United States generado por faker');
  });

  test('sin IA, genera el perfil con Faker', async ({}, testInfo) => {
    const data = await new TestDataFactory(unavailable, testInfo, undefined).registration();

    expect(data.zipcode).toMatch(/^\d{5}$/);
    expect(descriptionsOf(testInfo)).toContain('perfil de United States generado por faker');
  });

  test('repite una ejecución con los datos de TEST_DATA_FILE', async ({}, testInfo) => {
    const replayFile = testInfo.outputPath('perfil.json');
    writeFileSync(replayFile, JSON.stringify({ source: 'ia', ...CANADIAN_PROFILE }));

    const data = await new TestDataFactory(unavailable, testInfo, replayFile).registration();

    expect(data.firstName).toBe('Chloé');
    expect(descriptionsOf(testInfo)).toContain('perfil de Canada generado por replay');
  });

  test('la tarjeta de prueba cumple Luhn y vence en el futuro', () => {
    const card = testPaymentCard('Chloé Tremblay');

    expect(passesLuhn(card.number)).toBe(true);
    expect(Number(card.expiryYear)).toBeGreaterThanOrEqual(new Date().getFullYear());
  });

  test('el validador de Luhn distingue números válidos e inválidos', () => {
    expect(passesLuhn('4111111111111111')).toBe(true);
    expect(passesLuhn('4111111111111112')).toBe(false);
    expect(passesLuhn('1234')).toBe(false);
  });
});
