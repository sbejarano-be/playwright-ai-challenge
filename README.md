# Automation Exercise · Playwright + IA

Automatización de extremo a extremo de [Automation Exercise](https://automationexercise.com) con **Playwright** y **TypeScript**, Page Object Model y fixtures personalizadas. Integra un LLM (OpenAI, Anthropic, Gemini u Ollama) para las **tres** opciones del reto:

| Opción                        | Qué resuelve                                                                                                         | Dónde             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------- |
| A. Selectores auto-reparables | Si un selector deja de funcionar, la IA propone otro, se valida y la prueba continúa, dejando registro               | `src/healing/`    |
| B. Aserciones semánticas      | `expectAI(texto, intención)` verifica el significado de un texto, no su coincidencia exacta                          | `src/assertions/` |
| C. Datos sintéticos           | Perfiles de cliente por país, instrucciones de entrega y datos de pago no deterministas, validados con reglas reales | `src/data/`       |

Las pruebas reportan el comportamiento real de la aplicación. La suite termina en rojo porque detecta **2 defectos confirmados** (UI-01 y UI-02, más abajo).

## Requisitos previos

- Node.js 22 o superior (ver `.nvmrc`) y npm.
- Opcional: una API key de OpenAI, Anthropic o Gemini, u [Ollama](https://ollama.com) corriendo en local. Sin IA la suite también se ejecuta: las pruebas cuyo oráculo es la IA se omiten con el motivo.

## Instalación y ejecución

```bash
git clone <URL_DEL_REPOSITORIO>
cd playwright-ai-challenge
npm install
npx playwright install --with-deps chromium

cp .env.example .env          # completar AI_PROVIDER, AI_API_KEY y AI_MODEL

npx playwright test           # modo headless: todos los proyectos
npx playwright test --ui      # UI Mode
npx playwright show-report    # reporte HTML
```

Otros comandos:

```bash
npm run test:framework        # pruebas del propio framework (sin red, IA simulada)
npm run test:e2e              # suites E2E (ejecuta antes el setup y al final el teardown)
npm run allure:generate       # reporte de Allure: allure-report/index.html, un solo archivo que abre con doble clic
npm run allure:open           # o servirlo en el navegador
npm run typecheck && npm run lint
```

**Por entorno:** `ENV=<nombre>` carga `.env.<nombre>` en vez de `.env`. Las variables del sistema tienen prioridad sobre el archivo.

```bash
ENV=qa npx playwright test                      # bash
$env:ENV="qa"; npx playwright test              # PowerShell
BASE_URL=https://otra-url npx playwright test   # sobrescribir una variable puntual
```

## Configuración (`.env`)

| Variable              | Uso                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `BASE_URL`            | Aplicación bajo prueba (por defecto `https://automationexercise.com`)                           |
| `AI_PROVIDER`         | `openai`, `anthropic`, `gemini`, `ollama` o `none`. Debe coincidir con el proveedor de la clave |
| `AI_API_KEY`          | Clave del proveedor (no se usa con Ollama)                                                      |
| `AI_MODEL`            | Modelo; por defecto `gpt-4o-mini`, `claude-haiku-4-5`, `gemini-3.8-flash` o `llama3.1`          |
| `AI_BASE_URL`         | Opcional: gateway compatible con OpenAI u Ollama remoto                                         |
| `AI_TIMEOUT_MS`       | Tiempo máximo por llamada a la IA                                                               |
| `AI_ASSERT_THRESHOLD` | Confianza mínima para aprobar una aserción semántica (0,8)                                      |
| `HEALING_MODE`        | `report` (anota y continúa), `strict` (falla si repara) u `off`                                 |
| `TEST_DATA_FILE`      | Repite una ejecución con un conjunto de datos adjunto a un reporte                              |
| `HTTPS_PROXY`         | Proxy corporativo para el navegador                                                             |

`.env` está en `.gitignore`: las claves nunca se suben al repositorio. En CI, la clave es un secreto (`AI_API_KEY`) y el proveedor y el modelo son variables del repositorio (ver [Integración continua](#integración-continua)).

## Cómo funciona cada opción de IA

### A. Selectores auto-reparables

1. El page object pide el elemento con su selector principal (por ejemplo `[data-qa="login-email"]`).
2. Si no aparece en 3 segundos (`TimeoutError`), se envía a la IA el **contenedor** del elemento: su árbol de accesibilidad y su HTML, sin valores de campos, scripts ni tokens.
3. La IA responde un selector CSS o XPath en JSON. Se acepta solo si encuentra **exactamente un elemento visible con el rol ARIA esperado**.
4. La prueba continúa y la reparación queda **anotada** (`self-healed`), **adjunta** al reporte y listada en `test-results/healing-report.json`, con los selectores que hay que actualizar.

La suite `self-healing.spec.ts` simula un despliegue que renombra los `data-qa` del login, interceptando el HTML con `page.route`. El login se completa con los selectores reparados.

### B. Aserciones semánticas

```ts
await expectAI(
  await orderPlacedPage.confirmationText(),
  'Confirma al cliente que su pedido se realizó con éxito, con un tono positivo o de felicitación',
);
```

- Primero, verificaciones deterministas (texto visible, no vacío, fragmentos obligatorios): la IA nunca es el único oráculo.
- LLM como juez con temperatura 0 y respuesta `{ verdict, confidence, reasoning }` validada con zod. Pasa con `verdict = pass` y confianza de al menos 0,8. Con Gemini 3 se mantiene la temperatura por defecto, como recomienda Google, y el razonamiento se limita al nivel `LOW`.
- El razonamiento se adjunta al reporte. El texto de la UI se marca como dato para que no pueda inyectar instrucciones.
- `reviews.spec.ts` incluye paráfrasis inyectadas por red, que deben pasar, y un **control negativo** con la intención contraria, que debe fallar.

### C. Datos sintéticos

- Perfil de cliente para un país elegido al azar entre los del formulario, validado con reglas reales (código postal oficial del país, edad adulta, formato de teléfono).
- Instrucciones de entrega generadas a partir de la dirección que muestra el checkout.
- Tarjeta de pago generada localmente (válida según Luhn); nunca la genera el LLM.
- Si la IA falla o responde datos inválidos, un reintento y luego Faker. El reporte indica la fuente (`ia`, `faker` o `replay`) y adjunta los datos para poder repetir la ejecución con `TEST_DATA_FILE`.

### Sin IA, o con la IA mal configurada

Al iniciar, cada proceso hace una **verificación previa** del proveedor: una petición mínima por el mismo camino que usan las pruebas (clave, modelo, parámetros y modo JSON). Si no hay clave, o si el proveedor la rechaza:

- Las pruebas cuyo oráculo principal es la IA se omiten con el motivo (`Requiere IA: …`).
- En los flujos de compra y registro, la aserción semántica queda anotada como "no ejecutada" y las demás verificaciones siguen.
- Los datos se generan con Faker.
- Si la IA **está configurada** pero no responde, la prueba de ambiente `el proveedor de IA configurado responde` falla con el mensaje del proveedor, marcado `[AMBIENTE]`. Así, una clave inválida aparece como un solo problema de ambiente y no como fallas del producto.

## Capacidades de Playwright usadas

| Requisito               | Implementación                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Custom fixtures         | `src/fixtures/test.ts`: `ai`, `expectAI`, `semanticJudge`, `healer`, `testData`, `aeApi`, `account`, `registeredAccounts` y page objects         |
| Intercepción de red     | Errores 500 y desconexión en el carrito; HTML reescrito para la deriva de selectores y las variantes de texto; bloqueo de publicidad de terceros |
| Global setup y teardown | Proyectos `setup` y `teardown`: cuenta creada por API, sesión guardada en `storageState` y cuenta eliminada al final                             |
| Observabilidad          | `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, reporte HTML y Allure                               |

## Hallazgos

| ID    | Defecto                                                                                                                                      | Evidencia                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| UI-01 | Si agregar un producto al carrito falla (error 500 o sin conexión), la UI no avisa al usuario: el producto simplemente no se agrega          | `cart-network.spec.ts`; el script del carrito solo maneja la respuesta exitosa |
| UI-02 | La reseña no se envía al servidor: el sitio muestra "Thank you for your review." durante 2 segundos, borra el formulario y descarta el texto | `reviews.spec.ts`; ninguna petición sale al enviar                             |

Resultado en CI con Gemini (`gemini-3.8-flash`): 43 pruebas, 40 pasan y 3 fallan, que son exactamente los defectos UI-01 (×2) y UI-02. Todas las pruebas con IA pasan y la auto-reparación reparó los 3 selectores del login. Sin clave de IA: framework 28 de 28, ambiente omitido, setup y teardown correctos, y E2E con 4 que pasan, 3 que fallan (los mismos defectos) y 5 omitidas por requerir IA. Detalle en [docs/DECISIONES.md](docs/DECISIONES.md#resultado-de-referencia).

## Estructura del proyecto

```
src/
├── ai/            Cliente de IA: interfaz común, proveedores (OpenAI, Anthropic, Gemini, Ollama), verificación previa, auditoría y JSON validado
├── assertions/    expectAI y el juez semántico
├── healing/       Auto-reparación de selectores
├── data/          Datos sintéticos (IA + Faker), reglas por país, tarjetas y cuenta compartida
├── network/       Bloqueo de terceros y reescritura del HTML
├── api/           API del sitio para preparar y limpiar datos
├── pages/         Page Object Model
├── fixtures/      test.extend con las fixtures personalizadas
├── reporting/     Reporter que genera healing-report.json
└── config/        Variables de entorno validadas con zod y rutas
tests/
├── environment/   Criterio de entrada del ambiente: el proveedor de IA configurado responde
├── setup/         Setup y teardown globales
├── e2e/           Compra, registro, reseñas, carrito ante fallos de red y auto-reparación
└── framework/     Pruebas del propio framework con IA simulada
```

## Integración continua

`.github/workflows/e2e-tests.yml` ejecuta la verificación estática y la suite completa en cada push a `main`, en cada pull request y a demanda. Publica el reporte HTML, el de Allure y las evidencias (traces, videos, `healing-report.json`) aunque haya fallas. El estado del job refleja el resultado real. En el artefacto `reportes-e2e`, `allure-report/index.html` se abre directamente con doble clic; el reporte HTML de Playwright se abre con `npx playwright show-report playwright-report`.

Para ejecutar las pruebas de IA en CI, configura en **Settings → Secrets and variables → Actions**:

| Tipo     | Nombre        | Valor                                                                              |
| -------- | ------------- | ---------------------------------------------------------------------------------- |
| Secreto  | `AI_API_KEY`  | La clave del proveedor                                                             |
| Variable | `AI_PROVIDER` | El proveedor de esa clave: `gemini`, `openai` o `anthropic` (por defecto `openai`) |
| Variable | `AI_MODEL`    | Opcional; si no existe se usa el modelo por defecto del proveedor                  |
| Variable | `AI_BASE_URL` | Opcional; solo para gateways compatibles con OpenAI                                |

## Decisiones de diseño

Las ambigüedades del enunciado, cómo se resolvieron y por qué están en [docs/DECISIONES.md](docs/DECISIONES.md).
