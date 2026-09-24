import { z } from 'zod';
import { COUNTRIES, POSTAL_CODE_FORMATS } from './countries';

const ADULT_BIRTH_YEAR = new Date().getFullYear() - 18;

/** Perfil de cliente validado con reglas reales: la salida de la IA se usa solo si cumple este schema. */
export const UserProfileSchema = z
  .object({
    title: z.enum(['Mr', 'Mrs']),
    firstName: z.string().min(1).max(40),
    lastName: z.string().min(1).max(40),
    company: z.string().min(1).max(60),
    address1: z.string().min(3).max(80),
    address2: z.string().max(80),
    country: z.enum(COUNTRIES),
    state: z.string().min(2).max(60),
    city: z.string().min(2).max(60),
    zipcode: z.string(),
    mobileNumber: z.string().regex(/^\+?[\d\s().-]{7,20}$/, 'teléfono con formato inválido'),
    birthDate: z.object({
      day: z.number().int().min(1).max(28),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(1940).max(ADULT_BIRTH_YEAR),
    }),
    deliveryInstructions: z.string().min(5).max(200),
  })
  .superRefine((profile, context) => {
    const format = POSTAL_CODE_FORMATS[profile.country];
    if (!format.pattern.test(profile.zipcode)) {
      context.addIssue({
        code: 'custom',
        path: ['zipcode'],
        message: `"${profile.zipcode}" no tiene el formato de código postal de ${profile.country} (ej. ${format.example})`,
      });
    }
  });

export type UserProfile = z.infer<typeof UserProfileSchema>;

export interface RegistrationData extends UserProfile {
  email: string;
  password: string;
}
