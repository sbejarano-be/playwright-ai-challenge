import { expect, skipWithoutAi, test } from '../../src/fixtures/test';
import { SELF_HEALED } from '../../src/healing/self-healing';
import { applySelectorDrift, type AttributeDrift } from '../../src/network/rewrite-document';

/** Un despliegue que renombró los data-qa del formulario de login. */
const LOGIN_DRIFT: AttributeDrift[] = [
  { attribute: 'data-qa', from: 'login-email', to: 'user-email-field' },
  { attribute: 'data-qa', from: 'login-password', to: 'user-secret-field' },
  { attribute: 'data-qa', from: 'login-button', to: 'user-submit' },
];

test.describe('Selectores auto-reparables', () => {
  test('sin cambios en el DOM, los selectores principales funcionan y no se repara nada', async ({
    loginPage,
    header,
    account,
  }, testInfo) => {
    await loginPage.goto();
    await loginPage.login(account.email, account.password);

    await expect(header.loggedInAs).toContainText(account.name);
    expect(testInfo.annotations.filter((annotation) => annotation.type === SELF_HEALED)).toHaveLength(0);
  });

  test('tras un despliegue que renombra los data-qa del login, la IA repara los selectores y el login se completa', async ({
    page,
    ai,
    loginPage,
    header,
    account,
  }, testInfo) => {
    skipWithoutAi(ai);
    await applySelectorDrift(page, '**/login', LOGIN_DRIFT);

    await loginPage.goto();
    await expect(page.locator('[data-qa="login-email"]'), 'la deriva de selectores está activa').toHaveCount(0);
    await loginPage.login(account.email, account.password);

    await expect(header.loggedInAs).toContainText(account.name);
    expect(testInfo.annotations.filter((annotation) => annotation.type === SELF_HEALED)).toHaveLength(3);
  });
});
