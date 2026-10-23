# Bloqueo de Stripe en vivo (modo TEST hasta el lanzamiento)

Estado: **cableado** en `backend/bookingService.ts` → `getStripe()` (único punto que crea el cliente Stripe del backend; `routes/payments.ts` y `paymentWebhookService.ts` lo usan). `api/_paymentWebhookIngress.ts` crea su propio cliente solo para verificar firmas de webhook y no se tocó.

- `backend/stripeModeGuard.ts`: `checkStripeMode()` / `assertStripeTestMode()`.
  Si `STRIPE_SECRET_KEY` empieza por `sk_live_` o `rk_live_` y `ALLOW_STRIPE_LIVE` no es `true` → error `STRIPE_LIVE_BLOCKED`.
- Tests: `tests/stripeModeGuard.contract.test.ts`.

## Cableado (hecho)
En `backend/bookingService.ts`, `getStripe()`, antes de `new Stripe(...)`:
```ts
import { assertStripeTestMode } from './stripeModeGuard';
assertStripeTestMode(process.env.STRIPE_SECRET_KEY);
```
Opcional: llamar `checkStripeMode()` al arrancar y registrar `mode` en `/api/health` (sin la clave).

## Encender cobros reales (solo con autorización escrita del dueño)
Cloud Run: `STRIPE_SECRET_KEY=sk_live_...` (Secret Manager) **y** `ALLOW_STRIPE_LIVE=true`.
Volver a TEST: clave `sk_test_...` o quitar `ALLOW_STRIPE_LIVE`.

## Claves restringidas
Las claves restringidas `rk_live_` se bloquean igual que `sk_live_`.

# Script de limpieza de leads de prueba (#331)
`scripts/discardTestLeads.ts`: DRY-RUN por defecto; descarte reversible vía
`POST /api/admin/leads/triage {action:'descartar', ids}` (requireOperator: `X-Operator-Key`
= `OPERATOR_API_KEY`, o `--id-token`). Lo corre solo el dueño. Ver cabecera del script.
