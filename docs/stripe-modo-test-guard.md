# Stripe deshabilitado en Costa Rica Tours

Estado: **deshabilitado por política del producto**. La plataforma no debe crear sesiones de checkout Stripe, procesar eventos de Stripe ni habilitar Stripe TEST/LIVE como medio de pago. Esta es una decisión de implementación de Costa Rica Tours, no asesoría ni afirmación jurídica general.

## Controles
- `backend/stripeModeGuard.ts`: bloquea cualquier clave Stripe, incluso `sk_test_` y aunque `ALLOW_STRIPE_LIVE=true`.
- `backend/bookingService.ts`: `getStripe()` invoca el guard antes de crear un cliente.
- `api/_paymentWebhookIngress.ts`: no valida ni reenvía webhooks Stripe.
- Las rutas de pago deben responder de forma segura y nunca cambiar el estado de una reserva por una respuesta del navegador.
- No eliminar integraciones ni datos históricos: conservar el código bloqueado para facilitar auditoría y una decisión futura documentada.
- No sustituir Stripe por SINPE, PayPal ni otra pasarela automáticamente. Cualquier alternativa requiere evaluación legal/técnica, consentimiento del dueño y pruebas sin cobros reales.

## Pruebas
`tests/stripeModeGuard.contract.test.ts` comprueba que TEST, LIVE, claves restringidas y `ALLOW_STRIPE_LIVE` quedan bloqueados.

## Reactivación
No hay bandera de entorno que reactive Stripe. Cualquier reconsideración requiere decisión explícita del dueño, revisión de cumplimiento y un PR nuevo.
