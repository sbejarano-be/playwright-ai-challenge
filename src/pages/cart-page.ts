import type { Locator, Page } from '@playwright/test';

export class CartPage {
  readonly emptyMessage: Locator;

  constructor(private readonly page: Page) {
    this.emptyMessage = page.getByText('Cart is empty!');
  }

  async goto(): Promise<void> {
    await this.page.goto('/view_cart');
  }

  row(productName: string): Locator {
    return this.page.locator('#cart_info_table tbody tr').filter({ hasText: productName });
  }

  async proceedToCheckout(): Promise<void> {
    // El botón no tiene href: navega con un script que se enlaza al final de la página.
    await this.page.waitForLoadState('load');
    await this.page.getByText('Proceed To Checkout').click();
    await this.page.waitForURL('**/checkout');
  }
}
