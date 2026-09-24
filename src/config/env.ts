import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const EnvSchema = z.object({
  BASE_URL: z.url().default('https://automationexercise.com'),
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'gemini', 'ollama', 'none']).default('none'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_BASE_URL: z.url().optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  AI_ASSERT_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  HEALING_MODE: z.enum(['report', 'strict', 'off']).default('report'),
  TEST_DATA_FILE: z.string().optional(),
  HTTPS_PROXY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/** Carga `.env`, o `.env.<ENV>` si se define ENV. Las variables que ya existen en el entorno tienen prioridad. */
function loadEnvFile(): void {
  const environment = process.env.ENV;
  const file = path.join(PROJECT_ROOT, environment ? `.env.${environment}` : '.env');
  if (existsSync(file)) {
    process.loadEnvFile(file);
  } else if (environment) {
    throw new Error(`No existe el archivo de ambiente ${file}`);
  }
}

function readEnv(): Env {
  loadEnvFile();
  // Una variable vacía (por ejemplo AI_API_KEY=) se trata como no definida.
  const defined = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ''));
  const result = EnvSchema.safeParse(defined);
  if (!result.success) {
    throw new Error(`Configuración inválida en las variables de entorno:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env = readEnv();
