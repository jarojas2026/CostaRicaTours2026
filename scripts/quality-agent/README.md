# QualityAgent diario (#393, #401)

Workflow `.github/workflows/quality-agent.yml` (cron 08:00 America/Costa_Rica + manual). Solo lectura contra producción:

| Severidad | Verificación |
|---|---|
| alta | Muestra diaria de 20 URLs del sitemap sin 404 |
| alta | CTA de cotización de una ficha: loading → success (envío interceptado, no crea leads) |
| alta | Embudo "Cotizar": no avanza del paso 1 sin fecha |
| alta | Deep-links de WhatsApp solo al número oficial |
| media | Moneda coherente en /tours |
| media | /privacy y /terms cargan |

Fallos → un único issue `[QualityAgent] Fallos en producción` (etiqueta `quality-agent` + prioridad). Nunca hace merges ni cambia datos.

Pendiente respecto a la referencia de diseño del agente: verificación de imágenes por similitud, LCP de /trip y /tours, registro en `agentRunLedgerService` y lote semanal de severidad baja.
