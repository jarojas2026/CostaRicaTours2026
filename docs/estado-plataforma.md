# Estado verificado — 16 de octubre de 2026

Base de B: main `5bef344` (incluye #255, #256, #257 y #258). El diagnóstico A de abajo corresponde a la revisión del 15 de octubre; su integración no demuestra recuperación del modelo en producción.

## A — IA: diagnóstico implementado; recuperación de producción pendiente

- Producción: `/api/health` respondió 200. Una consulta técnica sin datos personales a `/api/gemini/concierge` respondió `source: gemini_fallback`; no demuestra modelo activo.
- El cliente Gemini sólo admitía API key. Ahora admite Vertex mediante ADC con opt-in `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT` y `GOOGLE_CLOUD_LOCATION` (o `VERTEX_AI_REGION`). No se activa Vertex automáticamente ni se modifican permisos cloud.
- `GEMINI_MODEL` permite configurar el modelo del concierge; se conserva el default existente. Debe comprobarse que el modelo está disponible para la región y proyecto antes de cambiar producción.
- `/api/health/ai`: observaciones pasivas por instancia, sin consultas facturables. HTTP 200 únicamente con respuesta reciente del proveedor; HTTP 503 para desconocido/degradado. Caducidad de cinco minutos. **No es una sonda global ni un reemplazo del liveness `/api/health`**; en Cloud Run varias instancias pueden tener observaciones distintas.
- Logs estructurados `ai_provider_degraded` y `ai_provider_recovered`, sin errores crudos del SDK, prompts, claves ni identificadores de cuenta. Pendiente conectar estos eventos a una política de alerta de Cloud Monitoring; no se ha configurado ni enviado una notificación externa.
- Se conservan las declaraciones y ejecución de herramientas nacionales. Los contratos existentes verifican registros, fuentes SINAC, filtros de operadores y privacidad de guías. La ejecución con un modelo vivo sigue pendiente.
- El fallback del asistente reutiliza `knowledgeToolReply`; se retiran afirmaciones estáticas sin respaldo sobre tarifas, confirmación inmediata y cancelación de 24 horas. No se modifica el gate de pago del gateway.

### Verificación de producción del 16 de octubre

`GET /api/health/ai` devolvió HTTP 200 con `status: unconfigured`; ambos proveedores indican `configuration_missing`. La respuesta incluye la política y breakers incorporados en #257. El código HTTP por sí solo no prueba que exista un modelo activo. No se comprobaron todavía los permisos, secretos, modelo ni cuota en Cloud Run.

## Validación local A

- `npm ci`: inicialmente falló por peer `@vercel/build-utils` incompatible; corregido package-lock y regenerado bun.lock desde éste, sin cambiar package.json.
- `npm ci --no-audit --no-fund`: correcto.
- `npm run test:contracts`: 391/391 correctos tras añadir la nueva ruta al snapshot.
- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit`: correcto.
- `npx vite build`: correcto.
- Captura Playwright del JSON de diagnóstico local sin configuración: `evidence/2026-10-15/ai-health-unconfigured.png`. Es una vista del servicio de diagnóstico con entorno vacío, no evidencia de recuperación cloud.

## Pendientes y riesgos

1. Verificar, mediante identidad autorizada de Google Cloud, las variables/referencias a Secret Manager, IAM de la identidad runtime, modelo y cuota. No se accedió a esos datos en esta revisión.
2. Rotar/revocar la clave privada compartida fuera del gestor de secretos según AGENTS.md. No se utilizó ni copió al repositorio.
3. Tras desplegar A, probar una respuesta real y el ciclo de las cuatro herramientas nacionales; configurar alerta externa con deduplicación.
4. B: implementado sobre la ficha existente; validar el rewrite y las respuestas HTTP en un despliegue Vercel. Los 404 generales y sitemap/robots completos corresponden a E.
5. C–H y superavance: pendientes. Se encontraron también textos antiguos en otros agentes con tarifas y promesas estáticas; requieren auditoría separada antes de ampliar su autonomía.

Los adjuntos históricos basados en n8n no sustituyen la arquitectura nativa vigente.

## B — Fichas públicas y prerender

- Las tarjetas enlazan a `/tour/:id`. La ficha existente conserva sus flujos y reinicia el estado de reserva al cambiar de tour.
- El build genera HTML por tour con contenido ES/EN, canonical y JSON-LD TouristTrip, sin ofertas ni ratings inventados. El catálogo sigue cargándose de forma diferida en el cliente; las páginas no entran en la precaché PWA.
- Precio visible sólo con fuente HTTPS, fecha y marcador de publicación por operador; fuente, operador y fecha disponibles en la ficha. Los precios sin evidencia quedan como consulta.
- Mapa de referencia (no punto de recogida confirmado), enlaces a similares del catálogo y CTA «Consultar disponibilidad» hacia el flujo IA existente.
- Checkbox explícito de consentimiento antes del guardado desde el formulario de reserva existente. El formulario estructurado de leads y su validación del servidor siguen pendientes en C.
- No se cambia `api/[...path].ts`, el gate de evidencia del proveedor, los lockfiles ni el estado comercial de los tours.
- Prerender con metadata inicial en español y secciones ES/EN; no crea URLs separadas por idioma. La metadata del cliente cambia con idioma/tour.
- Capturas Playwright ES/EN en `evidence/2026-10-16/`: APIs y recursos externos aislados; no prueban inventario, pagos, entrega de correo ni disponibilidad del mapa externo.

### Validación B

- `npm ci --no-audit --no-fund`: correcto; ambos lockfiles sin cambios frente a main.
- `npm run test:contracts`: 405/405.
- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit`: correcto.
- `npx vite build`: correcto; 591 fichas generadas, índice JS 346,49 kB y catálogo diferido 555,67 kB.
- Playwright Chromium: 11/11, incluyendo ficha ES/EN, recarga, enlaces similares y HTML sin JavaScript. Red simulada mediante fixtures existentes.
- La verificación HTTP de las nuevas fichas en Vercel queda pendiente del despliegue.
