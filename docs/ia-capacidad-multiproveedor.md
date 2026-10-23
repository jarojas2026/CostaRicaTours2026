# Capacidad de IA para picos (cola + cadena de proveedores) — opcional

Estado: **sin cablear**. Hoy el router (`backend/aiRouter.ts`) usa el orden de
`aiConfig.providerOrder()` con breaker por proveedor. Gasto real: $0.

## Qué añade `backend/aiCapacityRouter.ts`
- Cola por instancia: `AI_CAPACITY_MAX_CONCURRENCY` (4), `AI_CAPACITY_MAX_QUEUE` (50),
  `AI_CAPACITY_QUEUE_TIMEOUT_MS` (8000). Si se llena → error 429 y el llamador usa la
  respuesta determinista (knowledgeReplies).
- Cadena de slots OpenAI-compatibles con enfriamiento exponencial y jitter ante
  429/408/5xx/401/403 (`AI_CAPACITY_BASE_COOLDOWN_MS` 2000, `AI_CAPACITY_MAX_COOLDOWN_MS` 60000):
  1. `primary` = `OPENAI_COMPAT_*` (ya existe).
  2. `free` = `AI_FREE_FALLBACK_API_KEY`, `AI_FREE_FALLBACK_MODEL` (**debe terminar en `:free`**,
     si no el slot se ignora), `AI_FREE_FALLBACK_BASE_URL` (por defecto `https://openrouter.ai/api/v1`).
  3. `paid` = `AI_PAID_SLOT_BASE_URL/API_KEY/MODEL`, solo si `AI_PAID_SLOT_ENABLED=true`
     **y** `AI_MAX_COST_USD` > 0. Por defecto apagado.
- Claves solo en servidor (Secret Manager → Cloud Run). Nunca `VITE_*`.
- El nombre del slot solo va a logs internos; nunca al cliente.

## Cableado pendiente (1 línea, `backend/aiRouter.ts`, rama `openai_compat` de `runGenerative`)
```ts
import { capacityChat } from './aiCapacityRouter';
// antes: openAiCompatChat({ messages, tools, signal })
// después: capacityChat({ messages, tools, signal })
```
Recomendado cablear después de medir en staging; el breaker de aiRouter sigue funcionando encima.

## Límites honestos
- Los planes `:free` tienen cuotas bajas (por minuto y por día); sirven de respaldo, no de capacidad principal.
- La cola es por instancia; con N instancias la concurrencia total es N × máximo.
- Para miles de consultas reales hace falta un slot de pago (requiere autorización de gasto del dueño).
