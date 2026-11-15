# Exclusión total de Stripe en Costa Rica Tours

Estado: **excluido por decisión del dueño**. No crear sesiones de checkout, no procesar webhooks, no consultar sesiones, no admitir enlaces ni configurar credenciales Stripe en ningún entorno. Esta es una decisión de producto de Costa Rica Tours, no una afirmación jurídica general.

## Controles verificados en código
- `backend/stripeModeGuard.ts`: bloquea cualquier clave TEST o LIVE.
- `backend/bookingService.ts`: el export heredado `getStripe()` siempre devuelve `null`; no importa ni instancia el SDK.
- `backend/routes/payments.ts`: endpoints heredados responden HTTP 410.
- `backend/paymentWebhookService.ts` y `backend/paymentWebhookHttpService.ts`: el procesador y handler heredados rechazan Stripe sin mutar reservas.
- `api/gateway.ts`: el webhook se rechaza en el borde con HTTP 410 antes de leer o reenviar el cuerpo.
- `src/utils/bookingAttempt.ts`: no permite dominios de checkout Stripe.
- `vercel.json`: no incluye orígenes Stripe en CSP.
- Los paquetes SDK se retiraron de los manifiestos activos; los archivos históricos se conservan.

## Compatibilidad histórica
Los nombres de funciones y rutas antiguas pueden permanecer temporalmente para responder con rechazo determinista. No representan una integración disponible ni una autorización para reactivarla. Cualquier proveedor alternativo requiere evaluación y aprobación explícita del dueño.
