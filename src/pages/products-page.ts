import type { Locator, Page } from '@playwright/test';

export class ProductsPage {
  /** Ventana modal que confirma que el producto se agregó al carrito. */
  readonly addedConfirmation: Locator;

  constructor(private readonly page: Page) {
    this.addedConfirmation = page.locator('#cartModal').getByRole('heading', { name: 'Added!' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/products');
  }

  /** Agrega el producto al carrito y devuelve su nombre. */
  async addToCart(productId: number): Promise<{ name: string }> {
    const card = this.page.locator('.productinfo').filter({
      has: this.page.locator(`a.add-to-cart[data-product-id="${productId}"]`),
    });
    const name = await card.locator('p').innerText();
    await card.locator('a.add-to-cart').click();
    return { name };
  }

  async openCartFromConfirmation(): Promise<void> {
    await this.page.locator('#cartModal').getByRole('link', { name: 'View Cart' }).click();
    await this.page.waitForURL('**/view_cart');
  }
}
