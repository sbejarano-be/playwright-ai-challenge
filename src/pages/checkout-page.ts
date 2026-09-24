import type { Locator, Page } from '@playwright/test';

export class CheckoutPage {
  readonly deliveryAddress: Locator;

  constructor(private readonly page: Page) {
    this.deliveryAddress = page.locator('#address_delivery');
  }

  async deliveryAddressText(): Promise<string> {
    return (await this.deliveryAddress.innerText()).replace(/\s*\n\s*/g, ', ');
  }

  async addComment(comment: string): Promise<void> {
    await this.page.locator('textarea[name="message"]').fill(comment);
  }

  async placeOrder(): Promise<void> {
    await this.page.getByRole('link', { name: 'Place Order' }).click();
  }
}
