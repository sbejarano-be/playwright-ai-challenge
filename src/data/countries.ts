/** Países que ofrece el formulario de registro de Automation Exercise. */
export const COUNTRIES = [
  'India',
  'United States',
  'Canada',
  'Australia',
  'Israel',
  'New Zealand',
  'Singapore',
] as const;

export type Country = (typeof COUNTRIES)[number];

/** Formato oficial del código postal de cada país: se usa para validar lo que genera la IA. */
export const POSTAL_CODE_FORMATS: Record<Country, { pattern: RegExp; example: string }> = {
  India: { pattern: /^\d{6}$/, example: '560001' },
  'United States': { pattern: /^\d{5}(-\d{4})?$/, example: '10001' },
  Canada: { pattern: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, example: 'M5V 2T6' },
  Australia: { pattern: /^\d{4}$/, example: '2000' },
  Israel: { pattern: /^\d{7}$/, example: '6100001' },
  'New Zealand': { pattern: /^\d{4}$/, example: '1010' },
  Singapore: { pattern: /^\d{6}$/, example: '018956' },
};
