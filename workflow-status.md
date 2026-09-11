# Estado de los Workflows de n8n — Costa Rica Tours

Última sincronización: **2026-09-10** (actualizado con los 8 workflows del roadmap de automatización de reservas).

Instancia de n8n: `https://costaricatours2026.app.n8n.cloud`

Los archivos JSON exportados viven en [`/workflows`](./workflows) para tener control de
versiones de la automatización, igual que el resto del código. **Importante:** estos
JSON no contienen credenciales ni secretos — n8n solo exporta referencias/placeholders,
nunca los valores reales de API keys o tokens.

| # | Workflow | ID en n8n | Estado | Dispara cuando... |
|---|---|---|---|---|
| 1 | [Pagos Automáticos a Proveedores de Tours](./workflows/pagos-automaticos-a-proveedores-de-tours.json) | `IKmmlw2wHdABsTed` | 🔴 Inactivo (faltan credenciales) | Diario 6am — paga tours ya finalizados |
| 2 | [Confirmación de Reserva al Cliente](./workflows/confirmacion-de-reserva-al-cliente.json) | `6gnDcs9Ss7QIpMRw` | 🔴 Inactivo (faltan credenciales) | Webhook desde `server.ts` al confirmar pago |
| 3 | [Recordatorio 24h Antes del Tour](./workflows/recordatorio-24h-antes-del-tour.json) | `LwgnVnKikhxucZ6U` | 🔴 Inactivo (faltan credenciales) | Diario 7am — tours de mañana |
| 4 | [Solicitud de Reseña Post-Tour](./workflows/solicitud-resena-post-tour.json) | `Er8taaV6RsA539xp` | 🔴 Inactivo (faltan credenciales) | Diario 5pm — tours ya finalizados hoy |
| 5 | [Reporte Diario de Operación](./workflows/reporte-diario-de-operacion.json) | `oHr24K6pPlTo6TKA` | 🔴 Inactivo (faltan credenciales) | Diario 8pm — resumen del día |
| 6 | [Vigilancia y Escalamiento](./workflows/vigilancia-y-escalamiento.json) | `tQVF8tpNkqVUVi4k` | 🔴 Inactivo (faltan credenciales) | Cada 2h — reservas atascadas en pago |
| 7 | [Antifraude y Alertas de Seguridad](./workflows/antifraude-y-alertas.json) | `aF99rTx1Klm9PqWs` | 🔴 Inactivo (faltan credenciales) | Webhook al crear/evaluar cada reserva |
| 8 | [Coordinación en Tiempo Real con Proveedores](./workflows/coordinacion-tiempo-real-proveedores.json) | `1wf8ZQ1XuVTpbHnw` | 🔴 Inactivo (faltan credenciales) | Webhook desde `server.ts` al confirmar pago |
| 9 | [Panel de Control Móvil vía Telegram](./workflows/panel-control-movil-telegram.json) | `pA90kLm4Qx8VnZ2e` | 🔴 Inactivo (faltan credenciales) | Comandos de Telegram (`/hoy`, `/reservas`, `/buscar`, `/confirmar`, `/alertas`) |

## Webhooks expuestos

| Workflow | URL de producción | Protección |
|---|---|---|
| Confirmación de Reserva al Cliente | `https://costaricatours2026.app.n8n.cloud/webhook/reserva-confirmada` | Header Auth (`X-Webhook-Secret`) |
| Coordinación en Tiempo Real con Proveedores | `https://costaricatours2026.app.n8n.cloud/webhook/notificar-proveedor` | Header Auth (`X-Webhook-Secret`) |
| Antifraude y Alertas de Seguridad | `https://costaricatours2026.app.n8n.cloud/webhook/evaluar-antifraude` | Header Auth (`X-Webhook-Secret`) |

`server.ts` / `backend/bookingService.ts` despachan a estas URLs automáticamente de forma resiliente e independiente (ver `backend/n8nService.ts`).

## Credenciales requeridas en n8n

- [ ] **Gmail** (OAuth2) — nombre exacto: `Costa Rica Tours - Gmail`
- [ ] **Telegram** (Bot API) — nombre exacto: `Costa Rica Tours - Telegram Bot`
- [ ] **Google Firebase Cloud Firestore** (Service Account) — nombre exacto: `Costa Rica Tours - Firebase` (Project ID ya inyectado: `gen-lang-client-0782739149`)
- [ ] **Header Auth** para los webhooks — header `X-Webhook-Secret`, mismo valor que `N8N_WEBHOOK_SECRET` en Cloud Run
- [ ] **PayPal** — solo para el workflow #1 (Pagos a Proveedores)

## Configuración de Identificadores (Placeholders)

- **Firebase Project ID**: Ya configurado en todos los workflows con el ID real del proyecto: `gen-lang-client-0782739149`.
- **Link de Reseñas**: Configurado con `https://costaricatours.es/resenas`.
- **Chat ID de Telegram**: `PENDIENTE_CONFIGURAR_CHAT_ID` (se reemplaza en n8n o con el ID del grupo/canal de alertas de Telegram del operador).
