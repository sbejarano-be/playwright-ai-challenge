import type { Page } from '@playwright/test';

/**
 * Intercepta el HTML de una página (solo navegaciones GET) y lo entrega modificado, como si el servidor
 * hubiera desplegado otra versión. Los envíos de formularios (POST) pasan sin cambios.
 */
export async function rewriteDocument(page: Page, url: string | RegExp, transform: (html: string) => string) {
  await page.route(url, async (route) => {
    const request = route.request();
    if (request.method() !== 'GET' || request.resourceType() !== 'document') {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers['content-length'];
    delete headers['content-encoding'];
    await route.fulfill({ response, headers, body: transform(await response.text()) });
  });
}

export interface AttributeDrift {
  attribute: 'data-qa' | 'id' | 'class';
  from: string;
  to: string;
}

/** Simula un despliegue que renombró atributos usados como selectores. */
export function applySelectorDrift(page: Page, url: string | RegExp, drifts: AttributeDrift[]) {
  return rewriteDocument(page, url, (html) =>
    drifts.reduce(
      (current, drift) => current.replaceAll(`${drift.attribute}="${drift.from}"`, `${drift.attribute}="${drift.to}"`),
      html,
    ),
  );
}

/** Reemplaza un texto del HTML por una variante, para probar aserciones sobre contenido que cambia. */
export function replaceDocumentText(page: Page, url: string | RegExp, original: string, replacement: string) {
  return rewriteDocument(page, url, (html) => html.replaceAll(original, replacement));
}
