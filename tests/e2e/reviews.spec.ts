import { expect, skipWithoutAi, test } from '../../src/fixtures/test';
import { replaceDocumentText } from '../../src/network/rewrite-document';

const PRODUCT_ID = 1;
const PRODUCT_PAGE = '**/product_details/*';
const ORIGINAL_MESSAGE = 'Thank you for your review.';
const INTENT = 'Agradece al cliente y confirma que su reseña fue recibida';

/** Variantes que conservan la intención: la aserción semántica debe aprobarlas. */
const PARAPHRASES = [
  '¡Gracias! Recibimos tu opinión sobre este producto.',
  'We appreciate your feedback. Your review has been received.',
];

/** Control negativo: intención contraria. Si el juez la aprobara, no serviría como oráculo. */
const CONTRARY_MESSAGE = 'Your review was rejected and will not be published.';

test.describe('Reseñas: aserciones semánticas', () => {
  test.beforeEach(({ ai }) => {
    skipWithoutAi(ai);
  });

  test('la confirmación real de la reseña cumple la intención esperada', async ({
    productDetailsPage,
    testData,
    expectAI,
  }) => {
    await productDetailsPage.goto(PRODUCT_ID);
    await productDetailsPage.submitReview(testData.review());

    await expect(productDetailsPage.reviewConfirmation).toBeVisible();
    await expectAI(await productDetailsPage.reviewConfirmation.innerText(), INTENT);
  });

  for (const paraphrase of PARAPHRASES) {
    test(`una variante del mensaje conserva la intención: "${paraphrase}"`, async ({
      page,
      productDetailsPage,
      testData,
      expectAI,
    }) => {
      await replaceDocumentText(page, PRODUCT_PAGE, ORIGINAL_MESSAGE, paraphrase);
      await productDetailsPage.goto(PRODUCT_ID);
      await productDetailsPage.submitReview(testData.review());

      await expect(productDetailsPage.reviewConfirmation).toBeVisible();
      await expectAI(await productDetailsPage.reviewConfirmation.innerText(), INTENT);
    });
  }

  test('control negativo: un mensaje con la intención contraria no pasa la aserción', async ({
    page,
    productDetailsPage,
    testData,
    semanticJudge,
  }) => {
    await replaceDocumentText(page, PRODUCT_PAGE, ORIGINAL_MESSAGE, CONTRARY_MESSAGE);
    await productDetailsPage.goto(PRODUCT_ID);
    await productDetailsPage.submitReview(testData.review());

    await expect(productDetailsPage.reviewConfirmation).toBeVisible();
    const verdict = await semanticJudge.evaluate(await productDetailsPage.reviewConfirmation.innerText(), INTENT);
    expect(verdict.verdict, verdict.reasoning).toBe('fail');
  });
});

test.describe('Reseñas: envío', () => {
  test('la reseña enviada llega al servidor [UI-02]', async ({ page, productDetailsPage, testData }) => {
    await productDetailsPage.goto(PRODUCT_ID);
    const sentToServer = page
      .waitForRequest((request) => request.method() !== 'GET' && request.url().startsWith(new URL(page.url()).origin), {
        timeout: 5_000,
      })
      .then(
        () => true,
        () => false,
      );

    await productDetailsPage.submitReview(testData.review());

    await expect(productDetailsPage.reviewConfirmation, 'el sitio confirma la reseña al usuario').toBeVisible();
    expect(await sentToServer, '[UI-02] la reseña confirmada debe enviarse al servidor').toBe(true);
  });
});
