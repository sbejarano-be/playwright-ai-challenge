import { readFileSync } from 'node:fs';
import { faker } from '@faker-js/faker';
import type { TestInfo } from '@playwright/test';
import { z } from 'zod';
import { completeJson } from '../ai/json-completion';
import type { AiAvailability, AiRequest } from '../ai/types';
import { env } from '../config/env';
import { COUNTRIES, type Country, POSTAL_CODE_FORMATS } from './countries';
import { DELIVERY_INSTRUCTIONS, fakerProfile, fakerReview, strongPassword, uniqueEmail } from './faker-data';
import { type PaymentCard, testPaymentCard } from './payment-card';
import { type RegistrationData, type UserProfile, UserProfileSchema } from './user-profile';

export type DataSource = 'ia' | 'faker' | 'replay';

export const TEST_DATA = 'datos de prueba';

const SYSTEM_PROMPT =
  'Generas datos de prueba sintéticos: ficticios, pero realistas y con formatos válidos. ' +
  'Nunca uses datos de personas reales. Responde solo con JSON válido.';

const DeliveryInstructionsSchema = z.object({ deliveryInstructions: z.string().min(5).max(200) });

/**
 * Datos no deterministas para los formularios. Orden de preferencia: archivo de repetición (TEST_DATA_FILE),
 * IA (validada con reglas reales y con un reintento) y, como respaldo, Faker. El reporte indica qué fuente se usó.
 */
export class TestDataFactory {
  constructor(
    private readonly ai: AiAvailability,
    private readonly testInfo: TestInfo,
    private readonly replayFile: string | undefined = env.TEST_DATA_FILE,
  ) {}

  async registration(country: Country = faker.helpers.arrayElement(COUNTRIES)): Promise<RegistrationData> {
    const { source, profile } = await this.profile(country);
    const data: RegistrationData = { ...profile, email: uniqueEmail(), password: strongPassword() };
    this.testInfo.annotations.push({
      type: TEST_DATA,
      description: `perfil de ${profile.country} generado por ${source}`,
    });
    await this.testInfo.attach(TEST_DATA, {
      contentType: 'application/json',
      body: JSON.stringify({ source, ...data, password: '********' }, null, 2),
    });
    return data;
  }

  /** Instrucción de entrega coherente con la dirección que muestra la página de checkout. */
  async deliveryInstructions(deliveryAddress: string): Promise<string> {
    if (this.ai.available) {
      try {
        const generated = await completeJson(
          this.ai.client,
          {
            purpose: 'datos sintéticos · instrucciones de entrega',
            system: SYSTEM_PROMPT,
            prompt: [
              `Dirección de entrega:\n${deliveryAddress}`,
              'Escribe una instrucción de entrega concreta y breve, en español, coherente con esa dirección.',
              'Responde con este JSON: {"deliveryInstructions": string}',
            ].join('\n\n'),
            temperature: 0.9,
            maxTokens: 150,
          },
          DeliveryInstructionsSchema,
        );
        this.testInfo.annotations.push({ type: TEST_DATA, description: 'instrucciones de entrega generadas por ia' });
        return generated.deliveryInstructions;
      } catch (error) {
        this.annotateFallback(error);
      }
    }
    return faker.helpers.arrayElement(DELIVERY_INSTRUCTIONS);
  }

  paymentCard(nameOnCard: string): PaymentCard {
    return testPaymentCard(nameOnCard);
  }

  review(): { name: string; email: string; text: string } {
    return fakerReview();
  }

  private async profile(country: Country): Promise<{ source: DataSource; profile: UserProfile }> {
    if (this.replayFile) {
      return { source: 'replay', profile: UserProfileSchema.parse(JSON.parse(readFileSync(this.replayFile, 'utf8'))) };
    }
    if (this.ai.available) {
      try {
        return {
          source: 'ia',
          profile: await completeJson(this.ai.client, profileRequest(country), UserProfileSchema),
        };
      } catch (error) {
        this.annotateFallback(error);
      }
    }
    return { source: 'faker', profile: fakerProfile() };
  }

  private annotateFallback(error: unknown): void {
    this.testInfo.annotations.push({
      type: TEST_DATA,
      description: `la IA no generó datos válidos; se usa Faker (${String(error).slice(0, 200)})`,
    });
  }
}

function profileRequest(country: Country): AiRequest {
  const postalCode = POSTAL_CODE_FORMATS[country].example;
  return {
    purpose: `datos sintéticos · perfil de ${country}`,
    system: SYSTEM_PROMPT,
    prompt: [
      `Genera el perfil ficticio de un cliente que vive en ${country}, con este JSON exacto:`,
      '{"title": "Mr" | "Mrs", "firstName": string, "lastName": string, "company": string,',
      ` "address1": string, "address2": string, "country": "${country}", "state": string, "city": string,`,
      ' "zipcode": string, "mobileNumber": string, "birthDate": {"day": 1-28, "month": 1-12, "year": number},',
      ' "deliveryInstructions": string}',
      'Reglas:',
      `- zipcode con el formato oficial de ${country} (ejemplo: ${postalCode}).`,
      '- state y city reales y coherentes entre sí; dirección con el formato local.',
      `- mobileNumber con el formato local de ${country}: dígitos, espacios, guiones, paréntesis o un + inicial.`,
      '- Una persona adulta (mayor de 18 años).',
      '- deliveryInstructions: una instrucción de entrega concreta y breve, en español, coherente con la dirección.',
    ].join('\n'),
    temperature: 0.9,
    maxTokens: 500,
  };
}
