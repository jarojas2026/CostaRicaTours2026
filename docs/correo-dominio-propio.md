# Correo transaccional con dominio propio (SMTP ↔ Resend)

Estado: `EMAIL_PROVIDER` ausente = `auto` (conducta histórica). Hoy se envía por SMTP/Gmail.
Nada de esto activa envíos automáticos: `SUPERVISOR_AUTOSEND_ENABLED=false` y
`LEAD_AUTOFOLLOWUP_ENABLED=false` siguen igual.

## Interruptor (`backend/emailProviderSelect.ts`)
| `EMAIL_PROVIDER` | Transporte |
|---|---|
| `auto` (defecto) | Resend si hay `RESEND_API_KEY`, si no SendGrid, si no SMTP |
| `smtp` | solo SMTP/Gmail (aunque haya claves de API) |
| `resend` | solo Resend; si falta la clave **no** cae a SMTP en silencio: no envía y queda pendiente |
| `sendgrid` | solo SendGrid |
| `none` | ningún envío (emergencia) |

Claves solo en Cloud Run / Secret Manager (`RESEND_API_KEY`, `SMTP_PASS`). Nunca `VITE_*`.

## Pasar a dominio propio (requiere comprar dominio = gasto, autorización del dueño)
1. Comprar el dominio (p. ej. ~USD 10-12/año). Recibir correo gratis con Cloudflare Email Routing.
2. En Resend: Add domain → copiar los registros DNS que muestra:
   - **SPF**: TXT en `send.<dominio>`: `v=spf1 include:amazonses.com ~all` (usar el valor exacto que muestre Resend).
   - **DKIM**: TXT `resend._domainkey.<dominio>` con la clave pública que da Resend.
   - **MX** de retorno en `send.<dominio>` (valor de Resend).
   - **DMARC** (recomendado): TXT `_dmarc.<dominio>`: `v=DMARC1; p=none; rua=mailto:dmarc@<dominio>`; subir a `quarantine` tras 2-4 semanas limpias.
3. Esperar "Verified" en Resend.
4. Cloud Run: `RESEND_API_KEY` (Secret Manager), `EMAIL_FROM="Costa Rica Tours <reservas@<dominio>>"`, `EMAIL_PROVIDER=resend`.
5. Probar con un correo propio (no clientes). Volver atrás: `EMAIL_PROVIDER=smtp`.

## Notas
- El plan gratis de Resend tiene cupo diario/mensual limitado; para volumen hace falta plan de pago.
- `emailProviderStatus()` marca `freeMailboxSender` si `EMAIL_FROM` es Gmail/Outlook: con Resend eso no se puede verificar.
