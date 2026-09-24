import { fakerEN_US as faker } from '@faker-js/faker';
import { type RegistrationData, type UserProfile, UserProfileSchema } from './user-profile';

export const DELIVERY_INSTRUCTIONS = [
  'Dejar el paquete en la recepción del edificio.',
  'Llamar al timbre dos veces; el portero recibe los paquetes.',
  'Entregar después de las 6 p. m.; no dejarlo en la puerta.',
  'Si no hay nadie, dejarlo con el vecino del apartamento 2B.',
];

const REVIEWS = [
  'La tela es suave y la talla corresponde a la guía.',
  'Llegó a tiempo y bien empacado. Lo volvería a comprar.',
  'Buena calidad por el precio; el color es igual al de la foto.',
];

/** Respaldo sin IA: perfil de Estados Unidos generado con Faker y validado con el mismo schema. */
export function fakerProfile(): UserProfile {
  const birth = faker.date.birthdate({ mode: 'age', min: 18, max: 80 });
  return UserProfileSchema.parse({
    title: faker.helpers.arrayElement(['Mr', 'Mrs']),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    company: faker.company.name(),
    address1: faker.location.streetAddress(),
    address2: faker.location.secondaryAddress(),
    country: 'United States',
    state: faker.location.state(),
    city: faker.location.city(),
    zipcode: faker.location.zipCode('#####'),
    mobileNumber: faker.phone.number({ style: 'national' }),
    birthDate: { day: Math.min(birth.getDate(), 28), month: birth.getMonth() + 1, year: birth.getFullYear() },
    deliveryInstructions: faker.helpers.arrayElement(DELIVERY_INSTRUCTIONS),
  });
}

export function fakerRegistration(): RegistrationData {
  return { ...fakerProfile(), email: uniqueEmail(), password: strongPassword() };
}

export function fakerReview(): { name: string; email: string; text: string } {
  return { name: faker.person.firstName(), email: uniqueEmail(), text: faker.helpers.arrayElement(REVIEWS) };
}

/** Único por ejecución: el sitio es compartido y no admite dos cuentas con el mismo email. */
export function uniqueEmail(): string {
  return `qa.${Date.now()}.${faker.string.alphanumeric(6).toLowerCase()}@example.com`;
}

export function strongPassword(): string {
  return `${faker.internet.password({ length: 14 })}#1a`;
}
