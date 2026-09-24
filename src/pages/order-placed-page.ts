import type { Locator, Page } from '@playwright/test';

export class OrderPlacedPage {
  readonly heading: Locator;
  private readonly confirmation: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Order Placed!' });
    this.confirmation = page.locator('#form p').first();
  }

  async confirmationText(): Promise<string> {
    return this.confirmation.innerText();
  }
}
