import { z } from 'zod';
import { AiResponseError } from './errors';
import type { AiClient, AiRequest } from './types';

/**
 * Pide una respuesta JSON y la valida con el schema. Si no es válida, reintenta una vez;
 * si vuelve a fallar, lanza AiResponseError (error de automatización, no defecto del producto).
 */
export async function completeJson<T>(
  client: AiClient,
  request: AiRequest,
  schema: z.ZodType<T>,
  attempts = 2,
): Promise<T> {
  const problems: string[] = [];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await client.complete(request);
    const parsed = schema.safeParse(extractJson(response.text));
    if (parsed.success) {
      return parsed.data;
    }
    problems.push(z.prettifyError(parsed.error));
  }
  throw new AiResponseError(`La IA no devolvió un JSON válido en ${attempts} intentos:\n${problems.join('\n---\n')}`);
}

/** Tolera texto o bloques de código alrededor del objeto JSON. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return undefined;
  }
  try {
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  } catch {
    return undefined;
  }
}
