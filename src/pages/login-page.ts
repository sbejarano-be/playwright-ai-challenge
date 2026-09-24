import type { Page } from '@playwright/test';
import type { HealableTarget, SelfHealing } from '../healing/self-healing';

const LOGIN_FORM = 'form[action="/login"]';

/** Selectores del login con respaldo de auto-reparación por IA. */
export const LOGIN_TARGETS = {
  email: {
    description: 'campo de email del formulario de login',
    selector: '[data-qa="login-email"]',
    role: 'textbox',
    container: LOGIN_FORM,
  },
  password: {
    description: 'campo de contraseña del formulario de login',
    selector: '[data-qa="login-password"]',
    role: 'textbox',
    container: LOGIN_FORM,
  },
  submit: {
    description: 'botón Login',
    selector: '[data-qa="login-button"]',
    role: 'button',
    container: LOGIN_FORM,
  },
} satisfies Record<string, HealableTarget>;

export class LoginPage {
  constructor(
    private readonly page: Page,
    private readonly healer: SelfHealing,
  ) {}

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await (await this.healer.locate(this.page, LOGIN_TARGETS.email)).fill(email);
    await (await this.healer.locate(this.page, LOGIN_TARGETS.password)).fill(password);
    await (await this.healer.locate(this.page, LOGIN_TARGETS.submit)).click();
  }

  async startSignup(name: string, email: string): Promise<void> {
    await this.page.getByTestId('signup-name').fill(name);
    await this.page.getByTestId('signup-email').fill(email);
    await this.page.getByTestId('signup-button').click();
  }
}
