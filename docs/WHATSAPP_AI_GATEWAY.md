# WhatsApp Business → AI Intake Gateway

## Flujo

WhatsApp Business (Meta Cloud API)
→ `/api/webhooks/whatsapp`
→ verificación de firma
→ deduplicación del `message.id`
→ `processCustomerIntake()`
→ triage + conocimiento + agentes/tools + memoria
→ respuesta al viajero por WhatsApp
→ alerta al operador por correo/WhatsApp
→ escalación humana cuando la política lo requiere.

## Variables

- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: token usado por Meta para verificar el webhook.
- `WHATSAPP_APP_SECRET`: App Secret de Meta para validar `X-Hub-Signature-256`.
- `WHATSAPP_PHONE_NUMBER_ID`: identificador del número de WhatsApp Cloud API usado por el servicio de salida.
- `WHATSAPP_API_TOKEN`: token de acceso usado por el servicio de salida.
- `OWNER_WHATSAPP_NUMBER`: número del operador que recibe las alertas.

## Endpoints

- GET `/api/webhooks/whatsapp`: verificación del webhook de Meta.
- POST `/api/webhooks/whatsapp`: entrada de mensajes.

El POST devuelve HTTP 200 después de procesar los mensajes aceptados. Los mensajes duplicados se ignoran usando `whatsapp_inbound_events` cuando Firestore está disponible.

## Política operativa

La entrada de WhatsApp no salta directamente al operador. Pasa por el mismo cerebro utilizado por el sitio web. Las solicitudes que requieren autoridad humana, tienen baja confianza o son sensibles se marcan para escalación. Las reservas siguen requiriendo confirmación explícita y revalidación de disponibilidad antes de crear una reserva pendiente de pago.

## Seguridad

No guardar tokens reales en el repositorio. Configurarlos únicamente mediante los secretos/variables del entorno de despliegue.
