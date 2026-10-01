# Production Readiness — 2026-09-29

Este documento es el tablero operativo para llevar Costa Rica Tours a producción sin declarar como reales capacidades que todavía requieren verificación externa.

## Principios

- `main` es la fuente de verdad.
- No inventar disponibilidad, pagos, confirmaciones de proveedor ni métricas.
- Un retorno del navegador no confirma un pago: la confirmación debe venir del procesador y reconciliarse con la reserva.
- Una aprobación del cliente no equivale a pago; un pago no equivale a confirmación del proveedor.
- Automatización nativa Node/TypeScript + Firestore; no reintroducir n8n.
- Los secretos viven fuera del repositorio.

## Matriz de ejecución

| Frente | Estado verificable | Siguiente gate de producción |
|---|---|---|
| WIF/IAM | Existe `configure-vercel-wif.yml`; el gateway requiere configuración real | Crear/verificar Workload Identity Pool/Provider, service account invoker y variables `CLOUD_RUN_BACKEND_URL`, `GCP_WIF_AUDIENCE`, `GCP_WIF_SERVICE_ACCOUNT`; probar `/api/health` desde Vercel |
| Pagos | Existe reconciliación de retornos de Stripe/PayPal contra booking | Añadir/validar webhooks firmados asíncronos, idempotencia por event ID, monto/moneda/booking y tratamiento de refunds/duplicados |
| Scheduler | Hay cron/colas y locks distribuidos en código | Invocar procesos críticos desde scheduler externo autenticado para que no dependan de una instancia Node viva |
| E2E | Hay contratos/build y lógica de dominio | Añadir smoke/E2E autenticado en staging para búsqueda → disponibilidad → hold → pago sandbox → proveedor → confirmación |
| Imágenes | Existe `tourMediaService` y metadatos por tour | Auditar cada tour por actividad/destino, duplicados, alt text, procedencia y fallback; no copiar assets de terceros |
| Seguridad | Hay rate limiting, admission control y autenticación interna | Rotar credenciales expuestas, revisar secretos/headers/CORS/CSP, webhooks firmados, privilegio mínimo y endpoints persistentes |
| Carga | Existen límites de concurrencia en API/intake/AI/booking | Ejecutar carga reproducible sobre staging, medir p95/p99, errores, Firestore y proveedores externos; definir límites por capacidad real |
| Observabilidad | Existen logs de automatización, alertas y panel admin | Correlation/request IDs, métricas de lifecycle, errores por integración, alertas y runbooks sin registrar PII/secrets |

## Orden de cierre

1. **Identidad de infraestructura:** WIF/IAM y gateway Vercel → Cloud Run.
2. **Integridad financiera:** webhooks firmados y reconciliación idempotente.
3. **Operación autónoma:** scheduler externo para colas, holds y lifecycle.
4. **E2E de staging:** demostrar el ciclo completo sin dinero ni disponibilidad inventados.
5. **Seguridad:** rotación de credenciales, least privilege y revisión de superficie persistente.
6. **Carga + observabilidad:** medir antes de elevar concurrencia.
7. **Catálogo visual:** terminar auditoría de imágenes con evidencia por tour.

## Gates obligatorios antes de afirmar “producción lista”

- Build/TypeScript/contratos verdes.
- `/api/health` accesible por el gateway de producción y backend Cloud Run no expuesto accidentalmente.
- Pago sandbox demostrado mediante webhook firmado, no por query string/redirect.
- Reserva no llega a `confirmed` sin estado de proveedor verificable.
- Scheduler externo ejecuta al menos una tarea crítica con autenticación, lock e idempotencia.
- E2E pasa en staging con Firestore aislado o datos de prueba inequívocos.
- No hay secretos activos versionados; cualquier credencial compartida previamente está revocada/rotada.
- Prueba de carga documenta concurrencia, p95/p99 y tasa de error; no se promete una capacidad no medida.
- Alertas permiten detectar fallos de pago, proveedor, cola y gateway.

## Evidencia requerida

Cada cierre debe registrar: commit/PR, prueba ejecutada, entorno, resultado, fecha y cualquier dependencia externa pendiente. Un check verde de CI prueba el código que ejecutó ese check; no prueba por sí solo credenciales, DNS, disponibilidad de proveedor ni servicios externos de producción.
