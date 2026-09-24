/** El proveedor de IA no respondió o respondió con un error HTTP. */
export class AiProviderError extends Error {
  override name = 'AiProviderError';
}

/** La IA respondió, pero su salida no cumple el formato esperado. */
export class AiResponseError extends Error {
  override name = 'AiResponseError';
}
