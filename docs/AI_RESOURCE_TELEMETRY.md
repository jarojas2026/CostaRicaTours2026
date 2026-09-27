# Telemetría de recursos de IA

## Objetivo

Registrar por llamada de IA el modelo, proveedor, agente, latencia, tokens reportados por el proveedor y estimaciones configurables de costo, energía y agua.

La telemetría **no afirma medir físicamente el agua del centro de datos**. Las métricas de energía/agua solo se calculan cuando se proporcionan coeficientes documentados mediante variables de entorno.

## Fuentes de verdad

- Tokens: metadatos de uso devueltos por Gemini/Claude cuando están disponibles.
- Coste: se calcula únicamente con precios configurados en `AI_TELEMETRY_*_USD_PER_MILLION_TOKENS`.
- Energía: se calcula únicamente con `AI_TELEMETRY_KWH_PER_MILLION_TOKENS`.
- Agua: se calcula únicamente como energía x `AI_TELEMETRY_LITERS_PER_KWH`.

Cuando falta una fuente, el evento queda marcado como `unmeasured` o `request_estimate` y se guardan las suposiciones.

## Almacenamiento

Los eventos se guardan server-side en:

`ai_resource_telemetry/{eventId}`

Las reglas de Firestore mantienen por defecto el acceso del navegador bloqueado; el Centro de Control usa el backend autenticado.

## Endpoint administrativo

`GET /api/admin/ai-resource-telemetry?hours=24&limit=1000`

Requiere permisos administrativos y devuelve:

- llamadas, éxitos y fallos;
- tokens de entrada/salida/totales;
- costo estimado;
- energía estimada;
- agua estimada;
- proporción de datos medidos por proveedor frente a estimados/no medidos;
- modelos observados;
- supuestos de cálculo.

## Uso con Google Cloud

La siguiente evolución debe conectar el gasto real de Cloud Billing/Vertex AI al mismo panel, preferiblemente mediante exportación de billing a BigQuery cuando esa integración esté autorizada. El código actual queda preparado para separar:

`PROVIDER_USAGE` → `BILLING` → `ENERGY/WATER ESTIMATE`

No se deben introducir cifras de agua o energía como si fueran datos de facturación de Google Cloud.
