import type { Locator, Page } from '@playwright/test';

export interface Review {
  name: string;
  email: string;
  text: string;
}

export class ProductDetailsPage {
  /**
   * Mensaje de confirmación; el sitio lo muestra durante 2 segundos después de enviar la reseña.
   * Se apunta a la alerta y no a #review-section, que mide 0 px de alto porque su contenido es flotante.
   */
  readonly reviewConfirmation: Locator;

  constructor(private readonly page: Page) {
    this.reviewConfirmation = page.locator('#review-section .alert-success');
  }

  async goto(productId: number): Promise<void> {
    await this.page.goto(`/product_details/${productId}`);
  }

  async submitReview(review: Review): Promise<void> {
    await this.page.locator('#name').fill(review.name);
    await this.page.locator('#email').fill(review.email);
    await this.page.locator('#review').fill(review.text);
    await this.page.locator('#button-review').click();
  }
}
