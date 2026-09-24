import type { Locator, Page } from '@playwright/test';
import type { RegistrationData } from '../data/user-profile';

export class SignupPage {
  constructor(private readonly page: Page) {}

  async fillAccountInformation(user: RegistrationData): Promise<void> {
    await this.page.locator(`input[name="title"][value="${user.title}"]`).check();
    await this.field('password').fill(user.password);
    await this.field('days').selectOption(String(user.birthDate.day));
    await this.field('months').selectOption(String(user.birthDate.month));
    await this.field('years').selectOption(String(user.birthDate.year));
    await this.field('first_name').fill(user.firstName);
    await this.field('last_name').fill(user.lastName);
    await this.field('company').fill(user.company);
    await this.field('address').fill(user.address1);
    await this.field('address2').fill(user.address2);
    await this.field('country').selectOption(user.country);
    await this.field('state').fill(user.state);
    await this.field('city').fill(user.city);
    await this.field('zipcode').fill(user.zipcode);
    await this.field('mobile_number').fill(user.mobileNumber);
  }

  async createAccount(): Promise<void> {
    await this.field('create-account').click();
  }

  private field(testId: string): Locator {
    return this.page.getByTestId(testId);
  }
}
