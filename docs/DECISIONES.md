# Decisiones y supuestos: prueba de automatización de UI con IA

Algunos puntos del enunciado admiten más de una interpretación. Este documento registra cada decisión, su motivo y lo que se verificó contra la aplicación real (23-09-2026).

## Criterios

1. Lo explícito y concreto prevalece sobre lo genérico.
2. Ante una contradicción, prevalece lo que el documento repite o desarrolla más. Si una sección general contradice varias secciones específicas y todos los comandos, prevalecen las específicas.
3. El comportamiento real de la aplicación se verifica antes de diseñar la prueba.
4. La IA nunca decide sola: toda salida del LLM se valida antes de usarse y queda adjunta al reporte.

**Principio de reporte:** las pruebas reportan lo que la aplicación hace. Si no cumple lo esperado, la prueba falla y el defecto queda registrado. Una prueba que no puede ejecutarse por falta de configuración (por ejemplo, sin clave de IA) se marca como omitida con el motivo; nunca como aprobada ni como fallida. No hay reintentos automáticos (`retries: 0`).

## Stack

| Tema               | Decisión                                                                     | Motivo                                                                                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje           | TypeScript                                                                   | Lo exigen la sección 2 ("desarrollado en TypeScript"), la configuración pedida (`playwright.config.ts`, `test.extend`) y todos los comandos (`npm`, `npx`). Es también el stack del rol. La mención a Java 21 y Maven se interpreta como heredada de la prueba de API.                              |
| Runner             | Playwright Test 1.63                                                         | Fixtures, `playwright.config.ts`, UI Mode y el reporte HTML son de este runner. JUnit y TestNG no aplican a TypeScript.                                                                                                                                                                             |
| Gestor de paquetes | npm                                                                          | Es el que usan los comandos del enunciado.                                                                                                                                                                                                                                                          |
| Node.js            | 22 LTS o superior                                                            | Playwright 1.63 exige Node 20 o superior; Node 18 dejó de tener soporte en abril de 2025.                                                                                                                                                                                                           |
| Reportes           | HTML de Playwright + Allure 3 (`allure-playwright` y la CLI `allure` de npm) | Playwright admite varios reporters a la vez, así que se cumplen las dos menciones del enunciado. Allure 3 no necesita Java. El reporte de Allure se genera en un solo `index.html` que se abre con doble clic: con varios archivos, el navegador bloquea la carga de datos desde disco (`file://`). |
| Evidencias         | Trace, captura y video solo al fallar                                        | Configuración pedida en la sección 2.                                                                                                                                                                                                                                                               |
| Patrón             | Page Object Model, con los page objects inyectados como fixtures             | Estándar en Playwright; las fixtures evitan instanciar objetos en cada prueba.                                                                                                                                                                                                                      |
| Salida del LLM     | Validada con zod                                                             | Tipos y reglas garantizados antes de usar cualquier respuesta.                                                                                                                                                                                                                                      |
| Datos de respaldo  | `@faker-js/faker`                                                            | Se usa cuando la IA no está disponible o responde datos inválidos.                                                                                                                                                                                                                                  |
| Calidad            | TypeScript `strict`, ESLint (con `eslint-plugin-playwright`) y Prettier      | Errores detectados antes de ejecutar y estilo uniforme.                                                                                                                                                                                                                                             |

## Decisiones

### D-01. Aplicación objetivo

- **Ambigüedad:** se ofrecen tres aplicaciones y el `.env` de ejemplo apunta a SauceDemo.
- **Decisión:** Automation Exercise.
- **Motivo:** es la única de las tres que cubre todo lo que nombra el enunciado:

| Lo que pide el enunciado            | SauceDemo | Automation Exercise      | Restful-Booker Platform |
| ----------------------------------- | --------- | ------------------------ | ----------------------- |
| Flujo de compra o reserva           | Sí        | Sí                       | Sí                      |
| Formulario de registro              | No        | Sí                       | No                      |
| Formulario de pago                  | No        | Sí                       | No                      |
| Reseñas                             | No        | Sí                       | No                      |
| Login para `storageState`           | Sí        | Sí                       | Solo administrador      |
| Llamadas al backend que interceptar | No        | Sí (`/add_to_cart/{id}`) | Sí                      |

- **Riesgos y mitigación:**
  - Publicidad de terceros que tapa elementos: se bloquean sus dominios con `context.route`. Riesgo residual: la interacción con anuncios queda fuera de la cobertura.
  - Ambiente compartido: emails únicos por ejecución y cuentas eliminadas al terminar.
  - Tiempos de respuesta variables: esperas automáticas de Playwright, sin esperas fijas.
- El `.env.example` queda con `BASE_URL=https://automationexercise.com`.

### D-02. Setup global y `storageState` en "las diferentes suites"

- **Decisión:**
  - Proyecto `setup`: crea el usuario por API (`POST /api/createAccount`), inicia sesión por UI y guarda el `storageState` en `.auth/`.
  - Proyecto `teardown`: elimina el usuario (`DELETE /api/deleteAccount`) y verifica por API que ya no existe.
  - La suite de compra reutiliza la sesión guardada. La suite de auto-reparación usa las credenciales de la misma cuenta para iniciar sesión, porque el login es lo que prueba. La suite de registro crea sus propias cuentas y las elimina con una fixture.
- **Motivo:** los proyectos de setup y teardown son la forma de setup global que recomienda Playwright: aparecen en el reporte, generan traces y pueden usar fixtures, a diferencia de `globalSetup`. Preparar los datos por API y probar por UI hace la suite más rápida y estable.

### D-03. Tres obstáculos y "al menos dos" opciones de IA

- **Decisión:** se implementan las tres opciones, una por obstáculo:

| Obstáculo                 | Opción de IA                  | Implementación                  |
| ------------------------- | ----------------------------- | ------------------------------- |
| 1. Selectores que cambian | A. Selectores auto-reparables | `src/healing/self-healing.ts`   |
| 2. Textos que varían      | B. Aserciones semánticas      | `src/assertions/expect-ai.ts`   |
| 3. Datos sintéticos       | C. Generación de datos        | `src/data/test-data-factory.ts` |

- Fixtures personalizadas (`src/fixtures/test.ts`): `ai`, `expectAI`, `semanticJudge`, `healer`, `testData`, `aeApi`, `account`, `registeredAccounts` y los page objects.

### D-04. Quién provoca los cambios de selectores

- **Ambigüedad:** las aplicaciones no cambian sus selectores por sí solas.
- **Decisión:** `applySelectorDrift` intercepta el HTML de la página con `page.route`, renombra atributos (`data-qa`, `id` o `class`) y entrega la página modificada con `route.fulfill`. Simula un despliegue que alteró el DOM. Solo reescribe navegaciones GET: los envíos de formularios pasan sin cambios. En el login de Automation Exercise se renombran los tres `data-qa` del formulario, que son los que usan los selectores principales.
- **Localizadores:** por rol, etiqueta o `data-qa` (configurado como `testIdAttribute`). La IA solo interviene cuando el selector principal no aparece en 3 segundos.

### D-05. Textos que varían

- **Ambigüedad:** los textos de las tres aplicaciones son estáticos.
- **Decisión:** la aserción semántica se aplica a dos fuentes:
  - Textos reales del sitio: confirmación del pedido, de la cuenta creada y de la reseña.
  - Variantes inyectadas por intercepción: paráfrasis (en español y en inglés) que deben pasar y un texto con la intención contraria que debe fallar.
- **Motivo:** el texto que debe fallar es el control negativo del oráculo. Sin él no hay evidencia de que la aserción detecte errores; un juez que siempre aprueba no sirve como oráculo.

### D-06. Datos de registro, entrega y pago

- **Decisión:**
  - Registro por UI con un perfil generado por IA (opción C) para un país elegido al azar entre los que ofrece el formulario. Antes de usarse, se valida con zod: tipos, edad adulta y formato oficial del código postal del país.
  - Instrucciones de entrega generadas por IA a partir de la dirección que muestra la página de checkout.
  - Tarjeta: número de prueba generado con Faker y válido según Luhn. Nunca lo genera el LLM y nunca es un dato real.
  - Si la IA no responde o devuelve datos inválidos: un reintento y después Faker. El reporte indica qué fuente se usó (`ia`, `faker` o `replay`).
  - Reproducibilidad: cada conjunto de datos se adjunta al reporte, y `TEST_DATA_FILE` permite repetir una ejecución con los mismos datos.

### D-07. Intercepción de red

- **Decisión:** tres usos, cada uno con un propósito de prueba:
  1. **Inyección de errores:** `/add_to_cart/{id}` responde 500 o pierde la conexión. Resultado esperado: la UI avisa que el producto no se agregó y no muestra una confirmación falsa. Se confirmó el defecto UI-01.
  2. **Modificación de respuestas:** HTML con selectores cambiados (D-04) y textos variantes (D-05).
  3. **Aislamiento:** bloqueo de dominios de publicidad y analítica de terceros en todas las pruebas.

### D-08. Ejecución sin IA o con la IA mal configurada

- **Decisión:**
  - Proveedores `openai`, `anthropic`, `gemini` (API nativa) y `ollama` detrás de una interfaz común (patrón Strategy), elegidos con `AI_PROVIDER`. Ollama permite ejecutar sin costo y sin clave; si no responde, se trata como no disponible.
  - **Verificación previa:** cada proceso hace una petición mínima al proveedor por el mismo camino que usan las pruebas (clave, modelo, parámetros y modo JSON). Si falla, la IA se trata como no disponible y el motivo es el mensaje del proveedor.
  - Las pruebas cuyo oráculo principal es la IA (4 de reseñas y la de deriva de selectores) se **omiten con motivo** ("Requiere IA: …"). Hacerlas fallar sería un falso positivo sobre la aplicación.
  - En los flujos E2E (compra y registro), la aserción semántica es complementaria: se ejecutan las verificaciones deterministas y la aserción semántica queda anotada como "no ejecutada". La generación de datos usa Faker.
  - **Criterio de entrada del ambiente:** si la IA está configurada (proveedor y clave), la prueba `el proveedor de IA configurado responde` debe pasar. Si el proveedor rechaza la clave, esa prueba falla con el mensaje marcado `[AMBIENTE]` y Allure la clasifica como problema de ambiente. Ningún proyecto depende de ella: un problema de ambiente no bloquea las pruebas del producto.
  - El pipeline de CI lee la clave de un secreto y el proveedor de una variable del repositorio, y publica los reportes, así el resultado con IA se puede revisar sin ejecutar nada.

### D-09. Política de auto-reparación

- **Decisión:**
  - Si un selector se repara, la prueba continúa y su resultado depende de sus aserciones funcionales.
  - La reparación **nunca es silenciosa**: la prueba queda anotada como `self-healed`, el selector anterior y el nuevo se adjuntan al reporte, y un reporter propio escribe `test-results/healing-report.json` con los selectores que hay que actualizar.
  - Con `HEALING_MODE=strict`, una reparación hace fallar la prueba como error de automatización (no como defecto del producto). Sirve en CI para obligar a mantener los selectores.
- **Salvaguardas:**
  - Al LLM solo se envía el contenedor objetivo: su árbol de accesibilidad (`ariaSnapshot()`) y su HTML, ambos sin valores de campos, scripts ni tokens.
  - El selector propuesto se acepta solo si encuentra exactamente un elemento visible con el rol ARIA esperado.
  - Las reparaciones se guardan en caché por proceso para no repetir la consulta.
  - `page.accessibility` está obsoleto; se usa `locator.ariaSnapshot()`.

### D-10. Criterio de aceptación de la aserción semántica

- **Decisión:** `expectAI(textoReal, intencionEsperada)`:
  - Temperatura 0 y salida JSON validada con zod: `{ verdict: "pass" | "fail", confidence: 0-1, reasoning }`. Excepción: con Gemini 3 o posterior no se envía temperatura, porque Google recomienda mantener el valor por defecto (1.0) para evitar ciclos y respuestas degradadas, y el razonamiento se limita al nivel `LOW`. La estabilidad del juez se apoya en la salida validada, el umbral de confianza y el control negativo.
  - Pasa si `verdict` es `pass` y `confidence` es al menos `AI_ASSERT_THRESHOLD` (0,8 por defecto).
  - Antes de llamar a la IA hay verificaciones deterministas: texto visible y no vacío, y fragmentos obligatorios si se indican (`mustInclude`). La IA nunca es el único oráculo.
  - El prompt marca el texto evaluado como dato e indica ignorar cualquier instrucción que contenga (protección contra inyección de prompts desde la UI).
  - Si el LLM devuelve una respuesta inválida dos veces, es un error de automatización, no un defecto del producto.

### D-11. "Captura de peticiones y respuestas"

- **Decisión:** dos niveles:
  - Tráfico HTTP de la aplicación: incluido en el trace de Playwright.
  - Cada prompt y respuesta del LLM (proveedor, modelo, latencia y tokens): adjunto en los reportes HTML y Allure como "IA n · propósito".
- **Motivo:** cada decisión de la IA queda auditable.

### D-12. Ejecución por entorno

- **Decisión:** `ENV=<nombre>` carga `.env.<nombre>`; sin `ENV` se usa `.env`. Las variables del sistema tienen prioridad sobre el archivo, así que `BASE_URL` también se puede cambiar desde la línea de comandos. La aplicación tiene un único ambiente público; el mecanismo queda listo para otros.

### D-13. "Configuración empresarial"

- **Decisión:** se interpreta como ejecución en CI y en red corporativa:
  - Pipeline de GitHub Actions: verificación estática, ejecución y publicación de los reportes y evidencias siempre, también cuando hay fallos.
  - Proxy configurable: `HTTPS_PROXY` se traslada a `use.proxy` en `playwright.config.ts`.
  - Secretos solo en variables de entorno, nunca en el repositorio.

### D-14. Criterios de calidad del código

- **Decisión:** se aplican los mismos criterios de la prueba de API: Clean Code, SOLID, DRY, ejecución paralela (`fullyParallel`) y evidencias para diagnóstico.
- **Pruebas del propio framework:** el proyecto `framework` (28 pruebas, sin red, con una IA simulada) verifica las reglas de A, B y C: validación de propuestas, umbrales, reintentos, respaldos, repetición de datos y privacidad del contexto enviado a la IA.

### D-15. Requisitos previos en el README

- **Decisión:** Node.js 22 o superior, npm y Chromium de Playwright; clave de IA opcional (u Ollama local). Reemplazan la mención a Java 21 y Maven, que corresponde a la prueba de API.

### D-16. Proveedor y modelo por defecto

- **Decisión:** el `.env.example` conserva como ejemplo los valores del enunciado (`openai`, `gpt-4o-mini`). Proveedor y modelo se cambian con dos variables, sin tocar código. Modelos por defecto: `gpt-4o-mini`, `claude-haiku-4-5`, `gemini-3.8-flash` (el que Google recomienda para proyectos nuevos) y `llama3.1`.

## Notas técnicas descubiertas durante la implementación

- **Privacidad del contexto de auto-reparación.** Una prueba del framework detectó que `ariaSnapshot()` incluye lo escrito en los campos, contraseña incluida. Esos valores se eliminan antes de enviar el contexto a la IA.
- **Mensaje de reseña.** `#review-section` mide 0 px de alto porque su contenido es flotante; Playwright lo considera oculto aunque el usuario ve el mensaje. Las pruebas apuntan a la alerta interna.
- **"Proceed To Checkout" no tiene `href`.** Navega con un script que se enlaza al final de la página; un clic temprano no hace nada. La prueba espera la carga completa y confirma la navegación.
- **API de cuentas.** Responde HTTP 200 siempre; el resultado real está en el campo `responseCode` del cuerpo.
- **Clave de un proveedor enviada a otro.** En la primera ejecución en CI se configuró una clave de Gemini, pero `AI_PROVIDER` quedó con su valor por defecto (`openai`). OpenAI respondió 401 y fallaron las 7 pruebas que usan IA, incluidas compra y registro, cuyo flujo funcionaba. De ahí salieron el proveedor nativo de Gemini, la verificación previa y la prueba de ambiente: hoy ese mismo error aparece como una sola falla `[AMBIENTE]` con el mensaje del proveedor.

## Registro de defectos

| ID    | Hallazgo                                                                                | Esperado                                            | Obtenido                                                                                                                             | Severidad | Prueba                 |
| ----- | --------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------- |
| UI-01 | Si agregar un producto al carrito falla (500 o sin conexión), la UI no avisa al usuario | Un mensaje que indique que el producto no se agregó | Ningún mensaje: el producto simplemente no aparece. El script del carrito solo define qué hacer cuando la llamada tiene éxito        | Media     | `cart-network.spec.ts` |
| UI-02 | La reseña no se envía al servidor                                                       | La reseña confirmada se registra                    | El sitio muestra "Thank you for your review." durante 2 segundos, borra el formulario y no hace ninguna petición: el texto se pierde | Media     | `reviews.spec.ts`      |

Ambos se confirmaron con las pruebas automatizadas contra el sitio real y con el código fuente de la página. Las pruebas que los detectan incluyen el ID en el mensaje, que Allure usa para clasificarlas como "Defectos conocidos del producto" (`allurerc.mjs`).

## Resultado de referencia

Ejecución real en CI con Gemini (`gemini-3.8-flash`), 24-09-2026: **43 pruebas, 40 pasan y 3 fallan**, y las 3 fallas son los defectos conocidos (UI-01 ×2 y UI-02). La prueba de ambiente pasa, todas las pruebas con IA pasan (aserciones semánticas con su control negativo, compra y registro con datos generados por la IA) y la auto-reparación reparó los 3 selectores del login.

Ejecución completa sin clave de IA (`npx playwright test`):

| Proyecto         | Pasan | Fallan              | Omitidas              |
| ---------------- | ----- | ------------------- | --------------------- |
| environment      | 0     | 0                   | 1 (IA no configurada) |
| framework        | 28    | 0                   | 0                     |
| setup y teardown | 2     | 0                   | 0                     |
| e2e              | 4     | 3 (UI-01 ×2, UI-02) | 5 (requieren IA)      |

Antes de la ejecución real, la mecánica se validó contra el sitio real con un servidor local que imita las APIs de OpenAI y de Gemini y da respuestas guionizadas: clientes HTTP, verificación previa, deriva de selectores, reescritura del HTML, validación de propuestas, auditoría y reporte de reparaciones. Resultados:

| Escenario                              | environment        | e2e                                                                                   |
| -------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| IA disponible (Gemini, API nativa)     | pasa               | 9 pasan; fallan solo UI-01 ×2 y UI-02                                                 |
| Clave rechazada por el proveedor (401) | falla `[AMBIENTE]` | 4 pasan (compra y registro incluidas); 5 omitidas con motivo; fallan UI-01 ×2 y UI-02 |

Con un proveedor real, el veredicto de cada aserción depende del modelo.

## Clasificación de resultados

- **Fallida:** la aplicación no cumple lo esperado. Es un defecto del producto (conocido si el mensaje incluye `[UI-xx]`, nuevo si no).
- **Problema de ambiente:** el proveedor de IA no responde o rechaza la petición (mensaje marcado `[AMBIENTE]`). No es un defecto del producto.
- **Error de automatización:** excepción en el código de prueba, respuesta inválida del LLM o reparación en modo `strict`.
- **Omitida con motivo:** falta una dependencia, por ejemplo la IA, o la verificación previa del proveedor falló.
- **Anotada `self-healed`:** pasó, pero hay selectores que actualizar (ver `healing-report.json`).

Mientras la aplicación tenga defectos, una ejecución en rojo es el resultado correcto.
