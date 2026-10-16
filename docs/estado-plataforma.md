# Estado verificado — 15 de octubre de 2026

Base: main `fd16b0bf1687163c289eaf095630ba0eb61f438c` (PR #254).

## A — IA: diagnóstico implementado; recuperación de producción pendiente

- Producción: `/api/health` respondió 200. Una consulta técnica sin datos personales a `/api/gemini/concierge` respondió `source: gemini_fallback`; no demuestra modelo activo.
- El cliente Gemini sólo admitía API key. Ahora admite Vertex mediante ADC con opt-in `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT` y `GOOGLE_CLOUD_LOCATION` (o `VERTEX_AI_REGION`). No se activa Vertex automáticamente ni se modifican permisos cloud.
- `GEMINI_MODEL` permite configurar el modelo del concierge; se conserva el default existente. Debe comprobarse que el modelo está disponible para la región y proyecto antes de cambiar producción.
- `/api/health/ai`: observaciones pasivas por instancia, sin consultas facturables. HTTP 200 únicamente con respuesta reciente del proveedor; HTTP 503 para desconocido/degradado. Caducidad de cinco minutos. **No es una sonda global ni un reemplazo del liveness `/api/health`**; en Cloud Run varias instancias pueden tener observaciones distintas.
- Logs estructurados `ai_provider_degraded` y `ai_provider_recovered`, sin errores crudos del SDK, prompts, claves ni identificadores de cuenta. Pendiente conectar estos eventos a una política de alerta de Cloud Monitoring; no se ha configurado ni enviado una notificación externa.
- Se conservan las declaraciones y ejecución de herramientas nacionales. Los contratos existentes verifican registros, fuentes SINAC, filtros de operadores y privacidad de guías. La ejecución con un modelo vivo sigue pendiente.
- El fallback del asistente reutiliza `knowledgeToolReply`; se retiran afirmaciones estáticas sin respaldo sobre tarifas, confirmación inmediata y cancelación de 24 horas. No se modifica el gate de pago del gateway.

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
4. B: ya existe `TourDetailPage` y `/tour/:id`; falta completar enlaces, SEO/prerender, mapa y similares. No crear una ficha paralela.
5. C–H y superavance: pendientes. Se encontraron también textos antiguos en otros agentes con tarifas y promesas estáticas; requieren auditoría separada antes de ampliar su autonomía.

Los adjuntos históricos basados en n8n no sustituyen la arquitectura nativa vigente.
