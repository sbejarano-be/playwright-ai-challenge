import path from 'node:path';
import { PROJECT_ROOT } from './env';

/** Sesión y cuenta de prueba creadas por el proyecto `setup` (ignoradas por git). */
export const AUTH_DIR = path.join(PROJECT_ROOT, '.auth');
export const STORAGE_STATE = path.join(AUTH_DIR, 'user.json');
export const ACCOUNT_FILE = path.join(AUTH_DIR, 'account.json');
