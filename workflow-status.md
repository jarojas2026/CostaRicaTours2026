# Estado de los Workflows de n8n — Costa Rica Tours

Última sincronización: **2026-09-09** (generado automáticamente por Claude tras crear/exportar los workflows).

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

## Webhooks expuestos

| Workflow | URL de producción | Protección |
|---|---|---|
| Confirmación de Reserva al Cliente | `https://costaricatours2026.app.n8n.cloud/webhook/reserva-confirmada` | Header Auth (`X-Webhook-Secret`) — **pendiente de configurar la credencial en n8n** |

`server.ts` ya llama a esta URL automáticamente (ver `backend/n8nService.ts`) cada vez
que una reserva pasa a estado `confirmada`.

## Credenciales pendientes de configurar en n8n (una sola vez, compartidas entre los 4 workflows)

- [ ] **Gmail** (OAuth2) — nombre exacto: `Costa Rica Tours - Gmail`
- [ ] **Telegram** (Bot API) — nombre exacto: `Costa Rica Tours - Telegram Bot`
- [ ] **Google Firebase Cloud Firestore** (Service Account) — nombre exacto: `Costa Rica Tours - Firebase`
- [ ] **Header Auth** para el webhook de confirmación — header `X-Webhook-Secret`, mismo valor que `N8N_WEBHOOK_SECRET` en Cloud Run
- [ ] **PayPal** — solo para el workflow #1 (Pagos a Proveedores)

## Placeholders pendientes de reemplazar dentro de los nodos

- `PENDIENTE_CONFIGURAR_ID_PROYECTO_FIREBASE` / `<__PLACEHOLDER_VALUE__ID del proyecto de Firebase/Firestore__>` → Project ID real de Firebase (aparece en varios nodos de Firestore)
- `PENDIENTE_CONFIGURAR_CHAT_ID` / `<__PLACEHOLDER_VALUE__Chat ID de Telegram para el resumen__>` → Chat ID real de Telegram
- `PENDIENTE_CONFIGURAR_LINK_DE_RESENA` → link real de Google Business/TripAdvisor (solo en el workflow de Reseñas)

## Bugs corregidos durante esta sincronización

- **Confirmación de Reserva al Cliente**: el nodo `¿Cliente Tiene Email?` tenía una
  conexión que se apuntaba a sí mismo en su rama "true" (generada por un artefacto del
  SDK al usar `.onError()` antes de insertar el nodo en el flujo principal). Se eliminó
  la auto-conexión el 2026-09-09; la conexión correcta hacia `Enviar Confirmación por
  Email` se mantiene intacta. Verificado con `get_workflow_details` tras la corrección.

## Workflows del roadmap aún no construidos

Ver `docs/roadmap-automatizacion-reservas.md` para el contexto original. Pendientes:

- Vigilancia y Escalamiento (monitoreo de reservas atascadas)
- Antifraude y Alertas
- Reporte Diario de operación (ingresos, ocupación, pendientes)
- Coordinación en tiempo real con proveedores (aviso inmediato al confirmar reserva, no solo el pago posterior)
- Panel de Control Móvil vía comandos de Telegram
