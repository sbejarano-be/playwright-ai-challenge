import { STORAGE_STATE } from '../../src/config/paths';
import { saveAccount } from '../../src/data/account';
import { fakerRegistration } from '../../src/data/faker-data';
import { expect, test as setup } from '../../src/fixtures/test';

setup('crear la cuenta de prueba por API e iniciar sesión por UI', async ({ page, aeApi, loginPage, header }) => {
  const user = fakerRegistration();
  await aeApi.createAccount(user);
  saveAccount({ name: user.firstName, email: user.email, password: user.password });

  await loginPage.goto();
  await loginPage.login(user.email, user.password);
  await expect(header.loggedInAs).toContainText(user.firstName);

  await page.context().storageState({ path: STORAGE_STATE });
});
