import type { Locator, Page } from '@playwright/test';

export class AccountCreatedPage {
  readonly heading: Locator;
  private readonly paragraphs: Locator;
  private readonly continueLink: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Account Created!' });
    this.paragraphs = page.locator('#form p');
    this.continueLink = page.getByTestId('continue-button');
  }

  async messageText(): Promise<string> {
    return (await this.paragraphs.allInnerTexts()).join(' ');
  }

  async continue(): Promise<void> {
    await this.continueLink.click();
  }
}
