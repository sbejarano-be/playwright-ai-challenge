import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ACCOUNT_FILE, AUTH_DIR } from '../config/paths';

/** Cuenta compartida que crea el proyecto `setup` y elimina el proyecto `teardown`. */
export interface TestAccount {
  name: string;
  email: string;
  password: string;
}

export function saveAccount(account: TestAccount): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
}

export function loadAccount(): TestAccount {
  if (!existsSync(ACCOUNT_FILE)) {
    throw new Error(`No existe ${ACCOUNT_FILE}: la crea el proyecto "setup", que Playwright ejecuta antes de "e2e".`);
  }
  return JSON.parse(readFileSync(ACCOUNT_FILE, 'utf8')) as TestAccount;
}
