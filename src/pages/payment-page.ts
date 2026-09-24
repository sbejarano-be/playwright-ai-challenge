import type { Page } from '@playwright/test';
import type { PaymentCard } from '../data/payment-card';

export class PaymentPage {
  constructor(private readonly page: Page) {}

  async pay(card: PaymentCard): Promise<void> {
    await this.page.getByTestId('name-on-card').fill(card.nameOnCard);
    await this.page.getByTestId('card-number').fill(card.number);
    await this.page.getByTestId('cvc').fill(card.cvc);
    await this.page.getByTestId('expiry-month').fill(card.expiryMonth);
    await this.page.getByTestId('expiry-year').fill(card.expiryYear);
    await this.page.getByTestId('pay-button').click();
  }
}
