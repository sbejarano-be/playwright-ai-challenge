import { test as base } from '@playwright/test';
import { AuditedAiClient } from '../ai/audited-ai-client';
import { detectAi } from '../ai/create-ai-client';
import type { AiAvailability } from '../ai/types';
import { AutomationExerciseApi } from '../api/automation-exercise-api';
import { createExpectAI, type ExpectAI } from '../assertions/expect-ai';
import { SemanticJudge } from '../assertions/semantic-judge';
import { env } from '../config/env';
import { loadAccount, type TestAccount } from '../data/account';
import { TestDataFactory } from '../data/test-data-factory';
import { SelfHealing } from '../healing/self-healing';
import { blockThirdPartyAds } from '../network/block-third-parties';
import { AccountCreatedPage } from '../pages/account-created-page';
import { CartPage } from '../pages/cart-page';
import { CheckoutPage } from '../pages/checkout-page';
import { Header } from '../pages/header';
import { LoginPage } from '../pages/login-page';
import { OrderPlacedPage } from '../pages/order-placed-page';
import { PaymentPage } from '../pages/payment-page';
import { ProductDetailsPage } from '../pages/product-details-page';
import { ProductsPage } from '../pages/products-page';
import { SignupPage } from '../pages/signup-page';

interface WorkerFixtures {
  /** Proveedor de IA detectado una vez por proceso de trabajo. */
  ai: AiAvailability;
}

interface TestFixtures {
  /** La misma IA, pero con cada llamada adjunta al reporte de la prueba. */
  auditedAi: AiAvailability;
  expectAI: ExpectAI;
  semanticJudge: SemanticJudge;
  healer: SelfHealing;
  testData: TestDataFactory;
  aeApi: AutomationExerciseApi;
  account: TestAccount;
  /** Cuentas creadas durante la prueba; se eliminan al terminar, pase lo que pase. */
  registeredAccounts: TestAccount[];
  header: Header;
  loginPage: LoginPage;
  signupPage: SignupPage;
  accountCreatedPage: AccountCreatedPage;
  productsPage: ProductsPage;
  productDetailsPage: ProductDetailsPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  paymentPage: PaymentPage;
  orderPlacedPage: OrderPlacedPage;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  ai: [
    async ({}, use) => {
      await use(await detectAi());
    },
    { scope: 'worker' },
  ],

  context: async ({ context }, use) => {
    await blockThirdPartyAds(context);
    await use(context);
  },

  auditedAi: async ({ ai }, use, testInfo) => {
    await use(ai.available ? { available: true, client: new AuditedAiClient(ai.client, testInfo) } : ai);
  },

  expectAI: async ({ auditedAi }, use, testInfo) => {
    await use(createExpectAI(auditedAi, testInfo, env.AI_ASSERT_THRESHOLD));
  },

  semanticJudge: async ({ auditedAi }, use) => {
    if (!auditedAi.available) {
      throw new Error(`Esta prueba necesita IA: ${auditedAi.reason}`);
    }
    await use(new SemanticJudge(auditedAi.client));
  },

  healer: async ({ auditedAi }, use, testInfo) => {
    await use(new SelfHealing(auditedAi, testInfo, env.HEALING_MODE));
  },

  testData: async ({ auditedAi }, use, testInfo) => {
    await use(new TestDataFactory(auditedAi, testInfo));
  },

  aeApi: async ({ request }, use) => {
    await use(new AutomationExerciseApi(request));
  },

  account: async ({}, use) => {
    await use(loadAccount());
  },

  registeredAccounts: async ({ aeApi }, use, testInfo) => {
    const accounts: TestAccount[] = [];
    await use(accounts);
    for (const account of accounts) {
      await aeApi.deleteAccount(account.email, account.password).catch((error: unknown) => {
        testInfo.annotations.push({
          type: 'limpieza',
          description: `No se eliminó ${account.email}: ${String(error)}`,
        });
      });
    }
  },

  header: async ({ page }, use) => {
    await use(new Header(page));
  },
  loginPage: async ({ page, healer }, use) => {
    await use(new LoginPage(page, healer));
  },
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
  accountCreatedPage: async ({ page }, use) => {
    await use(new AccountCreatedPage(page));
  },
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
  productDetailsPage: async ({ page }, use) => {
    await use(new ProductDetailsPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  paymentPage: async ({ page }, use) => {
    await use(new PaymentPage(page));
  },
  orderPlacedPage: async ({ page }, use) => {
    await use(new OrderPlacedPage(page));
  },
});

export { expect } from '@playwright/test';

/** Omite la prueba, con el motivo, cuando la IA es su oráculo principal y no está disponible. */
export function skipWithoutAi(ai: AiAvailability): void {
  test.skip(!ai.available, ai.available ? '' : `Requiere IA: ${ai.reason}`);
}
