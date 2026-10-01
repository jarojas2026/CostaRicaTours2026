# Atención de llamadas

## Responsables
- Primera atención: asistente virtual Costa Rica Tours Agent Desk, conectado al Counter Desk existente.
- Escalamiento: persona/equipo definido en `VOICE_HUMAN_LABEL`, con destinos `VOICE_HUMAN_NUMBERS` (E.164 separados por coma). No se ha designado una persona real desde el código.
- Solicitar «operador», «persona», «human» o marcar 0 transfiere a los números configurados. Sin destinos, el sistema informa la limitación. Una transferencia fallida no confirma reservas.

## Activación pendiente de operaciones
1. Asignar responsable, cobertura horaria y números autorizados. La configuración actual no aplica turnos ni garantiza disponibilidad humana.
2. Configurar en el servidor `VOICE_AGENT_DESK_ENABLED=true`, `VOICE_PROVIDER_AUTH_TOKEN` desde el gestor de secretos y `PUBLIC_BASE_URL` como origen HTTPS público exacto.
3. En el número telefónico del proveedor, configurar POST `/api/voice/incoming` y callback POST `/api/voice/status`. Verificar que el gateway conserve cuerpo, query y `X-Twilio-Signature` sin exigir login de usuario a estos webhooks. No desactivar la validación de firma.
4. Hacer llamada real controlada: español/inglés, consulta, 0, solicitud verbal de humano, ocupado/sin respuesta y finalización. Revisar el registro con credenciales administrativas.
5. Comprobar coste, consentimiento y política de datos antes de activar grabaciones (este cambio no las activa).

El panel diferencia configuración lista de una línea realmente probada. No se compraron números, no se activó un proveedor, no se hicieron llamadas y no se enviaron reservas/correos reales durante estas pruebas.

Referencia: https://www.twilio.com/docs/voice/twiml/dial
