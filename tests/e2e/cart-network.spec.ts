import type { Route } from '@playwright/test';
import { expect, test } from '../../src/fixtures/test';

const ADD_TO_CART = '**/add_to_cart/**';

const NETWORK_FAILURES: { name: string; simulate: (route: Route) => Promise<void> }[] = [
  {
    name: 'el servidor responde 500',
    simulate: (route) => route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' }),
  },
  {
    name: 'se pierde la conexión',
    simulate: (route) => route.abort('internetdisconnected'),
  },
];

test.describe('Carrito ante fallos de red', () => {
  for (const failure of NETWORK_FAILURES) {
    test(`si ${failure.name} al agregar un producto, la UI no confirma el alta y avisa al usuario [UI-01]`, async ({
      page,
      productsPage,
    }) => {
      await page.route(ADD_TO_CART, failure.simulate);
      await productsPage.goto();

      const intercepted = page.waitForRequest(ADD_TO_CART);
      await productsPage.addToCart(1);
      await intercepted;

      // Soft: si la UI no avisa, igual se verifica que tampoco muestre una confirmación falsa.
      await expect
        .soft(
          page.getByText(/error|could not|couldn't|failed|try again|no se pudo|inténtalo/i).first(),
          '[UI-01] la UI debe avisar que el producto no se agregó al carrito',
        )
        .toBeVisible({ timeout: 5_000 });
      await expect(productsPage.addedConfirmation, 'no debe confirmar un producto que no se agregó').toBeHidden();
    });
  }

  test('el carrito sigue vacío si el alta del producto falló', async ({ page, productsPage, cartPage }) => {
    await page.route(ADD_TO_CART, (route) => route.fulfill({ status: 500, body: 'Internal Server Error' }));
    await productsPage.goto();

    const intercepted = page.waitForRequest(ADD_TO_CART);
    await productsPage.addToCart(1);
    await intercepted;

    await cartPage.goto();
    await expect(cartPage.emptyMessage).toBeVisible();
  });
});
