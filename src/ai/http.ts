import { AiProviderError } from './errors';

export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<unknown> {
  const origin = new URL(url).origin;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new AiProviderError(`[AMBIENTE] No se pudo conectar con ${origin}: ${String(error)}`);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new AiProviderError(`[AMBIENTE] ${origin} respondió ${response.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as unknown;
}

export async function isReachable(url: string, timeoutMs = 2_000): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}
