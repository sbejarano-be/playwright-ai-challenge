import type { BrowserContext } from '@playwright/test';

/**
 * Publicidad y analítica de terceros: no forman parte del sistema bajo prueba y sus anuncios intersticiales
 * tapan elementos de la página. Riesgo residual documentado: la interacción con anuncios queda fuera de la cobertura.
 */
const THIRD_PARTY_HOSTS = [
  'googlesyndication.com',
  'doubleclick.net',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'adtrafficquality.google',
  'fundingchoicesmessages.google.com',
  'adservice.google.com',
];

export function isThirdPartyAd(url: URL): boolean {
  return THIRD_PARTY_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

export async function blockThirdPartyAds(context: BrowserContext): Promise<void> {
  await context.route(isThirdPartyAd, (route) => route.abort('blockedbyclient'));
}
