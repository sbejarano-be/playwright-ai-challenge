import { expect, test } from '../../src/fixtures/test';

test.describe('Registro de clientes', () => {
  test('un cliente nuevo se registra con un perfil sintético coherente con su país', async ({
    loginPage,
    signupPage,
    accountCreatedPage,
    header,
    testData,
    registeredAccounts,
    expectAI,
  }) => {
    const user = await testData.registration();

    await loginPage.goto();
    await loginPage.startSignup(user.firstName, user.email);
    await signupPage.fillAccountInformation(user);
    await signupPage.createAccount();
    registeredAccounts.push({ name: user.firstName, email: user.email, password: user.password });

    await expect(accountCreatedPage.heading).toBeVisible();
    await expectAI(
      await accountCreatedPage.messageText(),
      'Confirma que la cuenta se creó correctamente y da la bienvenida al nuevo cliente',
    );
    await accountCreatedPage.continue();
    await expect(header.loggedInAs).toContainText(user.firstName);
  });
});
