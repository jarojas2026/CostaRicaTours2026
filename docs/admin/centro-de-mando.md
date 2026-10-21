# Centro de Mando de Costa Rica Tours (`/admin`)

Estado: diseño + Fase 1 en curso (2026-10-19). Autor: agente "crt-admin".

## 0. Inventario (lo que ya existe)

| Pieza | Dónde | Notas |
|---|---|---|
| Panel admin actual | `src/pages/AdminControlCenterPage.tsx` en `/admin`, `GET /api/admin/control-center` (`backend/adminControlCenterService.ts`) | Snapshot amplio (reservas, alertas, agentes, proveedores). Se conserva. |
| Leads | `/admin/leads` (`LeadsPipelinePage`), `GET/PATCH /api/admin/leads*` (`requireOperator`), colección Firestore `leads` | Máquina de estados `nuevo → cotizando → esperando_operador → confirmado_por_escrito → pagado / cancelado` con `statusHistory`, `triage` (spam/duplicado/descartado), `lastActivityAt`. Sin campo país. |
| Digest diario | `POST /api/internal/leads/digest` (X-Operator-Key) disparado por `.github/workflows/leads-digest.yml` 07:00 CR | Dry-run salvo `LEADS_DIGEST_ENABLED=true`. |
| Recordatorio a proveedores | `providerReminderService` vía `node-cron` `15 */6 * * *` en `backend/cronEngine.ts` | Con lock distribuido Firestore (`withDistributedAutomationLock`). |
| Otros crons | `backend/cronEngine.ts` (payouts 6:00, recordatorio 24 h, vigilancia 2 h, reseñas, reporte 20:00, clima 4 h, inbox/lifecycle/email/JARVIS cada minuto, soft-holds 5 min) | Solo se registran en memoria (`logAutomationExecution`, se pierde al reiniciar). |
| Cloud Scheduler | `scripts/configureOperationalScheduler.ts` → `/api/internal/{customer-intake,reservation-lifecycle,provider-inbox,email-operations}` | Cloud Run despliega con `--min-instances=0`: los `node-cron` solo corren con la instancia despierta. Por eso el heartbeat es imprescindible: muestra huecos reales. |
| Mapa | `.github/workflows/refresh-map-data.yml` (lunes 03:00 CR) | Abre PR si cambian datos. |
| Sitemap | `scripts/generateSitemap.ts` en build → `public/sitemap.xml` | No es proceso en runtime; se cuenta el número de URLs. |
| Salud | `GET /api/health`, `GET /api/health/ai` (`aiHealth.ts`, observaciones por instancia), `getBreakerStates()` (`aiRouter.ts`) | Latencia de IA solo en logs (`event: ai_call`). |
| Auth admin | Firebase ID token → `requireAdmin` (owner/admin por claim o `OWNER_EMAIL`/`ADMIN_EMAIL` verificados) en `backend/authMiddleware.ts`; UI `AdminRouteGuard` llama `/api/admin/access-policy` | Sólida en servidor. El login Google en producción depende de PR #284 (authDomain propio + proxy `/__/auth`), aún abierto. |
| Gráficos | No hay recharts ni React Flow | Se usan SVG propios (sin dependencias nuevas, presupuesto de bundle). |
| IA | `aiRouter.ts` (`runGenerative`, breaker, `redactPii`) + Groq vía `openai_compat` | `AI_ALLOW_EXTERNAL_PII=false` se respeta. |

## 1. Principios

1. **Cero datos inventados.** Si no existe la fuente, el campo es `null` y la UI muestra "sin datos" / "no conectado". No hay datos demo.
2. **Reutilizar la autenticación existente**: todo `/api/admin/*` nuevo usa `requireAdmin`. Sin login nuevo.
3. **Sin PII nueva**: los endpoints nuevos devuelven agregados e ids, nunca nombre/email/teléfono.
4. **Coste $0**: Firestore dentro de cuota (heartbeats con *throttle*), GitHub API pública con caché, Groq ya configurado.
5. **Humano en el circuito**: los agentes solo leen y proponen; nada externo se ejecuta sin aprobación del dueño (y en esta fase ni siquiera tras aprobar).

## 2. Datos y endpoints (Fase 1)

- `GET /api/admin/metrics` (`backend/adminMetricsService.ts`)
  - `leads`: ventana 90 días por `createdAt` (consulta de un solo campo, sin índice compuesto), `perDay` (30 d, día CR), `perWeek` (12 sem), `kpis` (hoy/7d/30d), `funnel` (estado actual + "alcanzó" vía `statusHistory`), `byTour`, `byRegion`, `byLanguage`, `byCountry: null` (no se captura), `firstResponse` (mediana/p90 horas desde `createdAt` hasta la primera transición humana), `conversion` (de los que llegaron a `cotizando`, % que llegó a `confirmado_por_escrito`/`pagado`), `stale24h`, `heatmap` (día×hora CR), `triage`.
  - `ai`: proveedor configurado, estado por proveedor, breakers, fallos/latencia de llamadas observadas en esta instancia (ring buffer en memoria; `scope: instance`).
  - `catalog`: tours, regiones, operadores prospecto, URLs del sitemap.
  - `finance`: `revenue: null` (Stripe en test → "próximamente"); tipo de cambio se lee de `/api/exchange-rate` existente en la UI.
- `GET /api/admin/processes` (`backend/adminProcessRegistry.ts`): catálogo estático de procesos (id, departamento, tipo, horario) + último estado en `admin_processes/{id}` + últimas ejecuciones `admin_runs` + runs de GitHub Actions (API pública, caché 5 min).
- `GET /api/admin/events`: auditoría `admin_events` (fallos de procesos, decisiones sobre propuestas, informes de agentes).
- Heartbeat: `trackProcessRun(id, fn)` envuelve cada cron/endpoint interno. Escribe `admin_processes/{id}` (estado, inicio, fin, duración, error) y `admin_runs` solo para jobs de baja frecuencia o fallos; los jobs de cada minuto se escriben como máximo cada 15 min salvo cambio de estado (cuota Firestore).

## 3. Departamentos digitales

| Departamento | Agente | KPIs / fuentes reales | Procesos |
|---|---|---|---|
| Dirección General | Agente de Gerencia | Resumen de todos | Informe diario |
| Ventas y Reservas | Agente de Ventas | leads, embudo, conversión, sin respuesta >24 h | digest, recuperación pre-venta |
| Atención al Cliente | Agente de Atención | idiomas, salud IA del asistente | bandeja correo, customer-intake |
| Operaciones y Proveedores | Agente de Operaciones | ICT/declaratoria pendiente de verificar, recordatorios | recordatorio proveedores 6 h, inbox, ciclo de reservas |
| Finanzas | Agente de Finanzas | tipo de cambio BCCR; ingresos "próximamente" (Stripe test) | payouts (fail-closed) |
| Marketing y Contenido | Agente de Marketing | URLs sitemap; YouTube "no conectado" | refresh mapa (GitHub) |
| Tecnología y Seguridad | Agente de Tecnología | /api/health, breakers, CI/deploys (GitHub Actions) | build-check, deploy |
| Legal y Cumplimiento | Agente Legal | % leads con consentimiento Ley 8968, retención, SINAC-ESCNNA (página publicada) | — |

Estado del departamento: rojo si algún proceso propio falló en su última ejecución o la IA está caída (para Atención); ámbar si hay datos vencidos (leads >24 h, proceso sin heartbeat en 2× su intervalo) o fuente no conectada; verde en otro caso.

## 4. UI (Fase 2)

`/admin` pasa a ser el Centro de Mando (pestañas Panorama · Departamentos · Procesos · Agente). El panel anterior queda en `/admin/control-center` sin cambios. Gráficos SVG propios (línea, embudo, barras, donut, heatmap), organigrama SVG, tabla de procesos con *polling* 30 s, ES/EN, responsive.

## 5. Agente de Gerencia (Fase 3)

`POST /api/admin/management-agent/ask` (requireAdmin): construye contexto con herramientas de solo lectura (metrics, processes, resumen de leads sin PII), redacta PII (`redactPii`), llama `runGenerative` (Groq/openai_compat). Anomalías deterministas (leads >24 h, procesos fallidos, IA caída) → `admin_proposals` (`pendiente|aprobada|rechazada`). Aprobar solo cambia el estado y registra `admin_events`; no envía nada. Informe diario por departamento con el scheduler existente.

## 6. Decisiones para el dueño

- Fusionar #284 (o equivalente) para que el login Google funcione en el dominio de producción; sin él, `/admin` no es usable desde el navegador aunque la API esté protegida.
- `/api/admin/leads` usa `requireOperator` (acepta `OPERATOR_API_KEY`); los endpoints nuevos usan `requireAdmin`. Valorar subir leads a `requireAdmin`.
- Cloud Run `--min-instances=0`: los crons de `node-cron` no corren con la instancia dormida. Opciones $0: mover los jobs a Cloud Scheduler (ya hay script) o GitHub Actions.
