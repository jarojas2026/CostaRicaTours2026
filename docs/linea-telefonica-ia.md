# Línea telefónica con IA — diseño (sin activar)

Estado: **apagada**. `VOICE_AGENT_DESK_ENABLED` ausente = false. Gasto real: $0.
Este documento no cubre la evaluación de voz en tiempo real (otro carril).

## Lo que ya existe en main
- Webhooks Twilio-compatibles en `backend/routes/voice.ts`: `/api/voice/incoming`, `/respond`,
  `/status`, `/human-transfer`, con firma `X-Twilio-Signature` (`VOICE_PROVIDER_AUTH_TOKEN`,
  falla cerrado), `CallSid` validado, recuperación ante errores y traspaso a humano (tecla 0).
- Detalle técnico: `docs/portable-voice-agent-desk.md`.

## Brecha con la regla de negocio
`docs/portable-voice-agent-desk.md` (paso 5) permite `create_reservation` por voz tras
confirmación explícita. La regla del dueño es: **por voz no se reserva ni se paga**; se deriva
al formulario de cotización o a un enlace de pago que genera una persona.

## Qué añade este PR (aditivo, sin cablear)
`backend/voiceHandoffPolicy.ts`:
- `filterVoiceTools()` quita las herramientas transaccionales (`create_reservation` y patrón
  `create_|confirm_|cancel_|pay_|…`) mientras `VOICE_TRANSACTIONS_BY_VOICE` no sea `true` (defecto false).
- `detectTransactionalIntent()` (ES/EN) y `voiceHandoffReply()` → texto hablado que remite a
  `PUBLIC_BASE_URL/tour/<id>` o `/tours`. Nunca confirma, nunca nombra proveedores, no envía nada.

## Cableado (hecho en este PR, flags siguen OFF)
1. `backend/aiAssistantService.ts` (`processChatInquiry`, opción `voiceChannel`): las declaraciones de
   herramientas pasan por `filterVoiceTools()` y el ejecutor rechaza `isTransactionalTool()` en voz.
   `backend/counterDeskService.ts` pasa `voiceChannel: channel === 'voice'`.
2. `handleVoiceTurn`: si `detectTransactionalIntent(speech) !== 'other'`, responde con
   `voiceHandoffReply(intent, language)` sin llamar a la IA.
3. Paso 5 de `docs/portable-voice-agent-desk.md` corregido.

## Activar (requiere gasto: número y minutos del proveedor; autorización del dueño)
Cloud Run / Secret Manager: `VOICE_AGENT_DESK_ENABLED=true`, `VOICE_PROVIDER_AUTH_TOKEN`,
`PUBLIC_BASE_URL=https://…`, destinos humanos opcionales. Registrar las URLs de callback en el
proveedor y hacer una llamada de prueba ES/EN antes de anunciar el número.
Alternativa de voz natural (ElevenLabs Agents u otro): mismo principio, detrás de su propio flag,
sin herramientas transaccionales.
