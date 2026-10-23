# Voz de servidor para "Escuchar respuesta" (apagada por defecto)

Estado: **apagado** (`ELEVENLABS_ENABLED` ausente = false). Gasto real: $0.

## Qué hay hoy (gratis)
El asistente ya lee las respuestas en voz alta con la voz del navegador
(Web Speech API, `src/components/AIAssistant.tsx`, `es-CR` / `en-US`). Eso no cambia.

## Qué añade este módulo (de pago, opcional)
- `backend/elevenLabsVoice.ts`: adaptador TTS de servidor con caché (50 entradas),
  tope diario de caracteres por instancia, auditoría sin texto (solo hash) y
  fallback silencioso a la voz del navegador ante cualquier fallo.
- `backend/routes/voiceTts.ts`: `POST /api/voice/tts` y `GET /api/voice/tts/status`,
  ambos con `requireAdmin`. Con el flag apagado responden `{ fallback: "browser" }`.
- La respuesta nunca nombra al proveedor. La clave nunca va al frontend (no hay `VITE_*`).

## Cómo encenderlo (requiere autorización de gasto del dueño)
1. Crear la clave en el proveedor y guardarla en Secret Manager como `ELEVENLABS_API_KEY`.
2. En Cloud Run (no en Vercel ni en `.env` del repo):
   - `ELEVENLABS_ENABLED=true`
   - `ELEVENLABS_API_KEY` (desde Secret Manager)
   - `ELEVENLABS_VOICE_ID_ES`, `ELEVENLABS_VOICE_ID_EN` (opcional; si falta usa la ES)
   - `ELEVENLABS_DAILY_CHAR_CAP` (por defecto 10000), `ELEVENLABS_MAX_TEXT_CHARS` (600)
   - `ELEVENLABS_MODEL_ID` (por defecto `eleven_multilingual_v2`)
3. Probar con sesión admin: `GET /api/voice/tts/status` y luego `POST /api/voice/tts`
   `{ "text": "Hola", "language": "es" }` → `audio/mpeg`.
4. Apagar: `ELEVENLABS_ENABLED=false`. No hace falta desplegar código.

## Pendiente (no incluido a propósito)
- El botón del cliente sigue usando solo la voz del navegador. Abrir el endpoint al
  público requiere antes un store durable para el tope (adaptador de estado compartido)
  y límite por IP. Hasta entonces es solo para admin/QA.
- El tope es por instancia (memoria); con N instancias el gasto máximo es N × tope.
