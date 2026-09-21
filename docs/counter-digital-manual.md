# 🛎️ MANUAL MAESTRO: COUNTER DIGITAL & COUNTER AGENT (COSTA RICA TOURS 2026)

Este documento contiene la arquitectura, instrucciones de sistema, esquemas de automatización en automatización nativa, integraciones en Netlify/GitHub y casos de prueba para el Mostrador Digital y la Agente Inteligente **Sofía (Counter Agent CR)**.

---

## 1. Arquitectura del Sistema
El sistema opera en dos componentes simbióticos:
- **Counter Agent (Sofía)**: Agente cognitivo con más de 15 años de conocimiento implícito en turismo costarricense, conectado a Gemini 2.5 Flash / Gemini Pro y validación atómica en Firestore.
- **Counter Digital**: Widget y plataforma de atención 24/7 con soporte para chat en vivo, cotizaciones instantáneas en USD y colones (₡515), captura de reservas y emisión de voucher QR.

---

## 2. Endpoints Disponibles
- `POST /api/agent/counter`: Endpoint principal para el widget y plataformas externas.
- `POST /api/gemini/concierge`: Enrutador multiagente con soporte de `agentId: 'counter_agent'`.
- `GET /counter-widget.js`: Script incrustable para cualquier sitio web externo.
- `GET /counter-widget.html`: Demo y vista previa autónoma.

---

## 3. Integración en Sitios Externos
Incrusta el siguiente código antes del cierre de `</body>`:

```html
<script 
  src="https://tudominio.com/counter-widget.js" 
  data-endpoint="https://tudominio.com/api/agent/counter"
  data-lang="es"
  data-color="#059669">
</script>
```
