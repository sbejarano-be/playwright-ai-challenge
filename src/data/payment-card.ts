import { faker } from '@faker-js/faker';

export interface PaymentCard {
  nameOnCard: string;
  number: string;
  cvc: string;
  expiryMonth: string;
  expiryYear: string;
}

/** Tarjeta de prueba generada localmente y válida según Luhn. Nunca la genera el LLM y nunca es un dato real. */
export function testPaymentCard(nameOnCard: string): PaymentCard {
  const number = faker.finance.creditCardNumber({ issuer: 'visa' }).replace(/\D/g, '');
  if (!passesLuhn(number)) {
    throw new Error(`Faker generó un número de tarjeta que no cumple Luhn: ${number}`);
  }
  const expiry = faker.date.future({ years: 4 });
  return {
    nameOnCard,
    number,
    cvc: faker.finance.creditCardCVV(),
    expiryMonth: String(expiry.getMonth() + 1).padStart(2, '0'),
    expiryYear: String(expiry.getFullYear()),
  };
}

export function passesLuhn(number: string): boolean {
  const digits = [...number].reverse().map(Number);
  const sum = digits.reduce((total, digit, index) => {
    if (index % 2 === 0) {
      return total + digit;
    }
    const doubled = digit * 2;
    return total + (doubled > 9 ? doubled - 9 : doubled);
  }, 0);
  return digits.length >= 12 && sum % 10 === 0;
}
