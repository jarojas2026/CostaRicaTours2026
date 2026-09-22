# 🇨🇷 Guía Oficial de Implementación de Webhooks en n8n y Motor Nativo Autónomo
**Costa Rica Tours 2026 • Arquitectura M2M, Notificación de Proveedores y Conciliación SINPE Móvil**

---

## 📌 1. Arquitectura del Sistema: Modo Dual (Nativo vs. n8n)

La plataforma opera bajo una arquitectura de **alta resiliencia y autonomía total**:
1. **Motor Nativo en Código (Autónomo 100%)**: Todo el procesamiento de reservas, antifraude, notificaciones y verificación de pagos se ejecuta internamente en Node.js y Firestore sin requerir servidores externos.
2. **Webhooks n8n (Orquestador Híbrido)**: Cuando se configuran las variables en `.env`, el sistema despacha los triggers con firma criptográfica HMAC SHA-256 hacia los workflows de n8n para analítica, integración con CRM o canales adicionales.

---

## 🔑 2. Variables de Entorno en `.env.example`

Configura las siguientes variables en tu archivo `.env` o en la consola de despliegue:

```bash
# Instancia y Seguridad de n8n
N8N_BASE_URL="https://costaricatours2026.app.n8n.cloud"
N8N_WEBHOOK_SECRET="tu-secreto-compartido-webhook"
N8N_API_KEY=""

# Endpoints de Webhooks Salientes (Triggers de la Plataforma hacia n8n)
N8N_BOOKING_WEBHOOK_URL="https://costaricatours2026.app.n8n.cloud/webhook/reserva-confirmada"
N8N_CHAT_WEBHOOK_URL="https://costaricatours2026.app.n8n.cloud/webhook/chat-consulta"
N8N_PROVIDER_NOTIFY_WEBHOOK_URL="https://costaricatours2026.app.n8n.cloud/webhook/notificar-proveedor"
N8N_ANTIFRAUD_WEBHOOK_URL="https://costaricatours2026.app.n8n.cloud/webhook/evaluar-antifraude"
N8N_SINPE_WEBHOOK_URL="https://costaricatours2026.app.n8n.cloud/webhook/cr-tours-sinpe-verify"

# Seguridad y Autenticación de Operadores
OPERATOR_API_KEY=""
```

---

## 🌿 3. Flujo 1: Notificación Automática y Coordinación de Proveedores

### 🎯 Objetivo
Despachar la orden de servicio al operador turístico local verificado (Arenal Eco-Adventures, Selvatura Monteverde, Pacuare River, Bay Island Cruises, etc.) y permitir que confirme o ajuste la logística con **1 solo clic** sin necesidad de llamadas telefónicas.

### 📥 3.1 Disparador (Webhook de Salida)
- **URL n8n**: `POST ${N8N_PROVIDER_NOTIFY_WEBHOOK_URL}`
- **Endpoint Nativo**: `POST /webhook/proveedores-coordinacion` o `/api/webhooks/provider-coordination`
- **Cabeceras de Seguridad**:
  - `Content-Type: application/json`
  - `X-Webhook-Secret: ${N8N_WEBHOOK_SECRET}`
  - `X-Webhook-Signature: <HMAC_SHA256_HEX>`

### 📦 3.2 Esquema del Payload JSON
```json
{
  "bookingId": "CRT-2026-8492",
  "idReserva": "CRT-2026-8492",
  "tourName": "Rafting Río Pacuare Clase III-IV",
  "tourDate": "2026-11-20",
  "tourTime": "06:30 AM",
  "adults": 2,
  "children": 0,
  "totalUSD": 290,
  "customerName": "Carlos Montero",
  "customerPhone": "+506 8888-7777",
  "pickupHotel": "Hotel Grano de Oro, San José",
  "paymentMethod": "Tarjeta de Crédito / SINPE Móvil",
  "providerId": "pacuare-river-expeditions"
}
```

### ⚙️ 3.3 Configuración de Nodos en n8n
1. **Webhook Node**:
   - `HTTP Method`: `POST`
   - `Path`: `notificar-proveedor`
   - `Authentication`: `Header Auth` (Validar que `X-Webhook-Secret` coincida).
2. **Switch / Router Node**:
   - Clasificar por `providerId` o región geográfica (Arenal, Monteverde, Manuel Antonio, Tortuguero, etc.).
3. **Send Email / WhatsApp Node**:
   - Enviar correo HTML al operador con las URLs interactivas:
     - **Confirmar**: `${APP_URL}/api/provider/respond?action=confirm&bookingId={{$json.bookingId}}&providerId={{$json.providerId}}`
     - **Proponer Ajuste**: `${APP_URL}/api/provider/respond?action=modify&bookingId={{$json.bookingId}}&proposedTime=07:00+AM`
     - **Declinar**: `${APP_URL}/api/provider/respond?action=decline&bookingId={{$json.bookingId}}`
4. **HTTP Request Node (Callback al Backend)**:
   - Notificar al backend de Costa Rica Tours para asentar el despacho:
     `POST ${APP_URL}/api/provider/respond` con `{ "bookingId": "...", "action": "confirm" }`.

### 🔄 3.4 Transición de Estados del Proveedor
```
[Reserva Creada] ──> providerStatus: 'pending' (Despacho Notificado)
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
[Confirmar 1-Clic]  [Ajuste de Hora]     [Declinar / Timeout]
        │                  │                  │
        ▼                  ▼                  ▼
providerStatus:     providerStatus:     providerStatus:
'confirmed'         'time_adjustment'   'declined'
(Asigna Guía/Placa) (Notifica Cliente)  ──> Failover Automático a
                                            Alsama Tours CR (Flota Propia)
```

---

## 📱 4. Flujo 2: Verificación de Pagos SINPE Móvil

### 🎯 Objetivo
Conciliar transferencias bancarias de **SINPE Móvil** (BAC, Banco Nacional, BCR, Banco Popular, Davivienda, etc.), validar el número de comprobante contra duplicados, cotejar el monto en Colones (CRC) y liberar la reserva de forma automática.

### 📥 4.1 Disparador (Webhook de Verificación)
- **URL n8n**: `POST ${N8N_SINPE_WEBHOOK_URL}`
- **Endpoint Nativo**: `POST /webhook/cr-tours-sinpe-verify` o `POST /api/payments/sinpe-verify`
- **Cabeceras de Seguridad**:
  - `Content-Type: application/json`
  - `X-Webhook-Secret: ${N8N_WEBHOOK_SECRET}`

### 📦 4.2 Esquema del Payload JSON
El webhook acepta tanto datos estructurados como el texto crudo del SMS bancario:

```json
{
  "bookingId": "CRT-2026-8492",
  "numeroComprobante": "12894567",
  "telefonoEmisor": "88887777",
  "montoCRC": 150800,
  "banco": "BAC Credomatic",
  "rawSmsText": "BAC Credomatic: Transferencia SINPE recibida por CRC 150,800.00 de Carlos Montero (88887777). Comprobante: 12894567."
}
```

### ⚙️ 4.3 Configuración de Nodos en n8n
1. **Webhook Node**:
   - `HTTP Method`: `POST`
   - `Path`: `cr-tours-sinpe-verify`
2. **Code Node (Parser Regex)**:
   - Extraer número de comprobante, monto y teléfono usando las expresiones regulares integradas en `backend/sinpeService.ts`.
3. **HTTP Request Node (Consulta de Reserva)**:
   - `GET ${APP_URL}/api/provider/status/{{$json.bookingId}}`
   - Validar que el monto en Colones cubra el total en USD (Tipo de cambio referencial ₡520).
4. **IF Node (Validación Antifraude)**:
   - Si el comprobante es válido y no está duplicado:
     - `POST ${APP_URL}/api/payments/sinpe-verify`
     - Pasa el estado a `status: 'confirmada'`, `paymentStatus: 'completed'`.
   - Si el monto es inferior:
     - Pasa a `status: 'en_revision_manual'`.
5. **Multi-Channel Dispatch Node**:
   - Envía WhatsApp y correo al cliente con el voucher digital y código QR.
   - Despacha automáticamente la notificación al operador del tour.

---

## 📊 5. Matriz de Estados de Reserva en Firestore

| Estado (`status`) | `paymentStatus` | Significado Operativo | Siguiente Acción Automática |
| :--- | :--- | :--- | :--- |
| `pendiente_pago` | `pending` | Soft-Hold activo por 15 min. | Liberación por Cron si no paga. |
| `pendiente_sinpe` | `pending` | Esperando transferencia SINPE. | Verificación por Webhook o SMS. |
| `en_revision_manual` | `pending` | Monto incompleto o duda bancaria. | Alerta a soporte vía Telegram. |
| `confirmada` | `completed` | Pago verificado exitosamente. | Despacho a proveedor + Voucher QR. |
| `rechazada_sinpe` | `failed` | Comprobante duplicado o inválido. | Notificación de rechazo al cliente. |
| `en_operacion` | `completed` | Tour en curso hoy con guía asignado. | Monitoreo de ruta y clima IMN. |
| `completada` | `completed` | Tour finalizado. | Disparo de encuesta NPS y reseña. |
| `cancelada` | `refunded` / `none` | Cancelada por cliente u operador. | Dispersión de reembolso si aplica. |

---

## 🛡️ 6. Pruebas y Verificación M2M

Puedes probar tus webhooks directamente usando `curl`:

### Prueba de Notificación de Proveedor:
```bash
curl -X POST http://localhost:3000/webhook/proveedores-coordinacion \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: tu-secreto-compartido-webhook" \
  -d '{
    "bookingId": "CRT-2026-TEST",
    "tourName": "Puentes Colgantes Monteverde",
    "tourDate": "2026-12-15",
    "tourTime": "08:00 AM",
    "adults": 2,
    "children": 0,
    "totalUSD": 110,
    "customerName": "Ana Rojas",
    "customerPhone": "+506 8765-4321",
    "pickupHotel": "Hotel Monteverde Lodge"
  }'
```

### Prueba de Verificación SINPE Móvil:
```bash
curl -X POST http://localhost:3000/webhook/cr-tours-sinpe-verify \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: tu-secreto-compartido-webhook" \
  -d '{
    "bookingId": "CRT-2026-TEST",
    "numeroComprobante": "88776655",
    "montoCRC": 57200,
    "banco": "Banco Nacional",
    "telefonoEmisor": "87654321"
  }'
```
