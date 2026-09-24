import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { RegistrationData } from '../data/user-profile';

/** API pública del sitio. Se usa para preparar y limpiar datos; las pruebas verifican la UI. */
export class AutomationExerciseApi {
  constructor(private readonly request: APIRequestContext) {}

  async createAccount(user: RegistrationData): Promise<void> {
    const response = await this.request.post('/api/createAccount', {
      form: {
        name: user.firstName,
        email: user.email,
        password: user.password,
        title: user.title,
        birth_date: user.birthDate.day,
        birth_month: user.birthDate.month,
        birth_year: user.birthDate.year,
        firstname: user.firstName,
        lastname: user.lastName,
        company: user.company,
        address1: user.address1,
        address2: user.address2,
        country: user.country,
        zipcode: user.zipcode,
        state: user.state,
        city: user.city,
        mobile_number: user.mobileNumber,
      },
    });
    await expectResponseCode(response, 201, 'crear la cuenta');
  }

  async deleteAccount(email: string, password: string): Promise<void> {
    const response = await this.request.delete('/api/deleteAccount', { form: { email, password } });
    await expectResponseCode(response, 200, 'eliminar la cuenta');
  }

  async accountExists(email: string): Promise<boolean> {
    const response = await this.request.get('/api/getUserDetailByEmail', { params: { email } });
    const body = (await response.json()) as { responseCode?: number };
    return body.responseCode === 200;
  }
}

/** La API responde HTTP 200 siempre; el resultado real viene en el campo `responseCode` del cuerpo. */
async function expectResponseCode(response: APIResponse, expected: number, action: string): Promise<void> {
  const body = (await response.json()) as { responseCode?: number; message?: string };
  if (body.responseCode !== expected) {
    throw new Error(`No se pudo ${action}: responseCode ${body.responseCode} (${body.message})`);
  }
}
