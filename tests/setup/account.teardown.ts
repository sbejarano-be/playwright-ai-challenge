import { loadAccount } from '../../src/data/account';
import { expect, test as teardown } from '../../src/fixtures/test';

teardown('eliminar la cuenta de prueba', async ({ aeApi }) => {
  const account = loadAccount();

  await aeApi.deleteAccount(account.email, account.password);

  expect(await aeApi.accountExists(account.email), 'la cuenta de prueba ya no existe').toBe(false);
});
