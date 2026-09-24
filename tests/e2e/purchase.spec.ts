import { STORAGE_STATE } from '../../src/config/paths';
import { expect, test } from '../../src/fixtures/test';

// La sesión la crea el proyecto "setup": esta suite no repite el login.
test.use({ storageState: STORAGE_STATE });

test.describe('Compra de extremo a extremo', () => {
  test('un cliente compra un producto, paga con datos sintéticos y recibe una confirmación con la intención correcta', async ({
    productsPage,
    cartPage,
    checkoutPage,
    paymentPage,
    orderPlacedPage,
    header,
    account,
    testData,
    expectAI,
  }) => {
    await productsPage.goto();
    await expect(header.loggedInAs, 'la sesión guardada por el setup sigue activa').toContainText(account.name);

    const product = await productsPage.addToCart(1);
    await expect(productsPage.addedConfirmation).toBeVisible();
    await productsPage.openCartFromConfirmation();
    await expect(cartPage.row(product.name)).toBeVisible();
    await cartPage.proceedToCheckout();

    const deliveryAddress = await checkoutPage.deliveryAddressText();
    await checkoutPage.addComment(await testData.deliveryInstructions(deliveryAddress));
    await checkoutPage.placeOrder();
    await paymentPage.pay(testData.paymentCard(account.name));

    await expect(orderPlacedPage.heading).toBeVisible();
    await expectAI(
      await orderPlacedPage.confirmationText(),
      'Confirma al cliente que su pedido se realizó con éxito, con un tono positivo o de felicitación',
    );
  });
});
