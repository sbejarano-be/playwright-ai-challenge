import { expect, test, type TestInfo } from '@playwright/test';
import { AiResponseError } from '../../src/ai/errors';
import { type HealableTarget, SELF_HEALED, SelfHealing } from '../../src/healing/self-healing';
import { available, FakeAiClient, unavailable } from './support/fake-ai-client';

/** Formulario después de un "despliegue" que renombró los data-qa. */
const DRIFTED_LOGIN_FORM = `
  <form action="/login">
    <input type="email" data-qa="email-v2" name="email" placeholder="Email Address">
    <input type="password" data-qa="password-v2" name="password" placeholder="Password">
    <button type="submit" data-qa="submit-v2">Login</button>
  </form>`;

const EMAIL: HealableTarget = {
  description: 'campo de email',
  selector: '[data-qa="login-email"]',
  role: 'textbox',
  container: 'form[action="/login"]',
};

const PRIMARY_TIMEOUT_MS = 300;

function proposal(selector: string, strategy: 'css' | 'xpath' = 'css'): string {
  return JSON.stringify({ strategy, selector, reasoning: 'atributo name estable' });
}

function healerWith(fake: FakeAiClient, testInfo: TestInfo, mode: 'report' | 'strict' = 'report'): SelfHealing {
  return new SelfHealing(available(fake), testInfo, mode, PRIMARY_TIMEOUT_MS, new Map());
}

test.describe('Auto-reparación de selectores', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(DRIFTED_LOGIN_FORM);
  });

  test('si el selector principal funciona, no consulta a la IA', async ({ page }, testInfo) => {
    await page.setContent('<form action="/login"><input data-qa="login-email" name="email"></form>');
    const fake = new FakeAiClient(proposal('input'));

    const locator = await healerWith(fake, testInfo).locate(page, EMAIL);

    await expect(locator).toHaveAttribute('name', 'email');
    expect(fake.requests).toHaveLength(0);
  });

  test('si el selector falla, usa la propuesta válida de la IA y lo anota en la prueba', async ({ page }, testInfo) => {
    const fake = new FakeAiClient(proposal('form[action="/login"] input[name="email"]'));

    const locator = await healerWith(fake, testInfo).locate(page, EMAIL);

    await expect(locator).toHaveAttribute('data-qa', 'email-v2');
    expect(testInfo.annotations.filter((annotation) => annotation.type === SELF_HEALED)).toHaveLength(1);
    expect(fake.requests[0]?.prompt).toContain('[data-qa="login-email"]');
    expect(fake.requests[0]?.temperature).toBe(0);
  });

  test('acepta propuestas XPath', async ({ page }, testInfo) => {
    const fake = new FakeAiClient(proposal('//form[@action="/login"]//input[@name="email"]', 'xpath'));

    const locator = await healerWith(fake, testInfo).locate(page, EMAIL);

    await expect(locator).toHaveAttribute('data-qa', 'email-v2');
  });

  test('rechaza una propuesta que encuentra más de un elemento', async ({ page }, testInfo) => {
    const fake = new FakeAiClient(proposal('form input'));

    await expect(healerWith(fake, testInfo).locate(page, EMAIL)).rejects.toThrow(/encuentra 2 elementos/);
  });

  test('rechaza una propuesta con un rol distinto al esperado', async ({ page }, testInfo) => {
    const fake = new FakeAiClient(proposal('form button'));

    await expect(healerWith(fake, testInfo).locate(page, EMAIL)).rejects.toThrow(/no tiene el rol esperado/);
  });

  test('en modo strict, una reparación hace fallar la prueba', async ({ page }, testInfo) => {
    const fake = new FakeAiClient(proposal('form[action="/login"] input[name="email"]'));

    await expect(healerWith(fake, testInfo, 'strict').locate(page, EMAIL)).rejects.toThrow(/HEALING_MODE=strict/);
  });

  test('una respuesta inválida de la IA se reintenta una vez y después falla como error de automatización', async ({
    page,
  }, testInfo) => {
    const fake = new FakeAiClient('no es JSON');

    await expect(healerWith(fake, testInfo).locate(page, EMAIL)).rejects.toThrow(AiResponseError);
    expect(fake.requests).toHaveLength(2);
  });

  test('sin IA, devuelve el selector principal para que la acción falle con su error real', async ({
    page,
  }, testInfo) => {
    const healer = new SelfHealing(unavailable, testInfo, 'report', PRIMARY_TIMEOUT_MS, new Map());

    const locator = await healer.locate(page, EMAIL);

    await expect(locator).toHaveCount(0);
  });

  test('no envía a la IA los valores de los campos', async ({ page }, testInfo) => {
    await page.locator('input[name="password"]').fill('secreto-que-no-debe-salir');
    await page.locator('form').evaluate((form) => {
      form.insertAdjacentHTML('beforeend', '<input type="hidden" name="csrfmiddlewaretoken" value="token-csrf">');
    });
    const fake = new FakeAiClient(proposal('form[action="/login"] input[name="email"]'));

    await healerWith(fake, testInfo).locate(page, EMAIL);

    expect(fake.requests[0]?.prompt).not.toContain('token-csrf');
    expect(fake.requests[0]?.prompt).not.toContain('secreto-que-no-debe-salir');
  });
});
