# Estado compartido entre instancias (rate-limit y locks) — opcional

Estado: **memoria por instancia** (como hoy). Gasto real: $0.

## Problema
`formAbuseGuard` (Map) y los `express-rate-limit` de `backend/routes/shared.ts` cuentan
por instancia. Con varias instancias de Cloud Run el límite real es N × límite.
Los cron ya tienen lock gratuito en Firestore (`withDistributedAutomationLock`).

## Qué añade este PR (aditivo, sin cablear)
`backend/sharedStateStore.ts`:
- `MemoryStateStore` (por defecto) y `UpstashStateStore` (Redis REST por `fetch`, sin SDK).
- `incr/decr/reset` con ventana, `acquireLock/releaseLock` con token.
- Si Redis falla o tarda > `SHARED_STATE_TIMEOUT_MS` (800 ms) → cae a memoria, nunca bloquea.
- `rateLimitStoreOption(prefix, windowMs)` → `{}` en modo memoria (cero cambio de conducta).

## Cableado pendiente (1 línea por limitador, lo hace el dueño o un PR aparte)
En `backend/routes/shared.ts`, en cada `rateLimit({...})`:
```ts
import { rateLimitStoreOption } from '../sharedStateStore';
export const chatLimiter = rateLimit({ windowMs: ..., limit: ..., ...rateLimitStoreOption('chat', <windowMs>) });
```
`formAbuseGuard` es síncrono con un Map; pasarlo al store requiere volverlo async (PR aparte).

## Cómo encenderlo (puede tener costo; el plan gratis de Upstash tiene límites)
Solo en Cloud Run / Secret Manager, nunca `VITE_*`:
- `SHARED_STATE_STORE=upstash`
- `UPSTASH_REDIS_REST_URL=https://...` y `UPSTASH_REDIS_REST_TOKEN` (Secret Manager)
- opcional: `SHARED_STATE_PREFIX` (por defecto `crt:`), `SHARED_STATE_TIMEOUT_MS`
Apagar: quitar `SHARED_STATE_STORE` o ponerlo en `memory`.
