import type { Locator, Page } from '@playwright/test';

export class Header {
  readonly loggedInAs: Locator;

  constructor(page: Page) {
    this.loggedInAs = page.locator('#header').getByText('Logged in as');
  }
}
