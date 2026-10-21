# Revisión read-only PRs JARVIS (#300–#313) — 2026-10-20
Base de todos: main 2c8f2f9. Ninguno toca api/[...path].ts ni código Stripe/PayPal (solo #312 lee env de credenciales). Sin merges/push/comentarios.

## Por PR
| PR | Qué hace | Archivos clave | Conflictos | Riesgo | Integrable |
|---|---|---|---|---|---|
| 300 | Quita métricas falsas: activeWorkflows 24 fijo→null, successRate 100 por defecto→null, revenueUSD→null + confirmedBookingValueUSD + financialEvidence | adminControlCenterService, nativeAutomationEngine, automationStatusMetrics(nuevo), AdminControlCenterPage | Page con 301/305 | Bajo (cambia contrato `revenueUSD`; revisar otros consumidores) | Sí, primero del bloque admin |
| 301 | Mission Control owner-only GET /api/admin/mission-control (agentRuns 60, approvals 40, planes 30, PII scrub) + pestaña "Misiones" | missionControlService, routes/admin.ts, MissionControlPanel, Page, serverRoutes.snapshot | admin.ts, Page, snapshot con 305 | Bajo | Sí, tras 305 (rebase) |
| 303 | Clima sin fallback sintético; prob. lluvia de la hora actual; timeout 8s; además quita promesa "soft-hold 15 min" del agente | weatherPulseService, routes/misc, DestinationPulse, agentKnowledgeFabric | Ninguno | Bajo (UI debe mostrar "no disponible") | Sí |
| 304 | Matriz QA 5 viewports extra + oculta BottomNav/widget en /tour/* | scripts/auditReadOnlyNavigation.mjs, App.tsx, e2e spec, skill | Ninguno | Bajo (cambio UI móvil) | Sí |
| 305 | Briefing ejecutivo owner-only determinista GET /api/admin/owner-briefing + pestaña "Gerencia JARVIS" | ownerExecutiveBriefingService, OwnerExecutiveBriefingPanel, admin.ts, Page | 301 (mismas líneas) | Bajo | Sí, tras 300 |
| 307 | Solo doc de auditoría y plan (P0 credencial GCP, #284, #174/#175) | docs/auditoria-integrada… | Ninguno | Nulo | Sí |
| 308 | sendEmail sin transporte devuelve success:false (antes `sim-mail-*` éxito) | notificationService | Idéntico dentro de 310 | Medio: sin SMTP/Resend todo correo falla visible | Cerrar; usar 310 |
| 309 | Elimina 85/15 fijo; despacho exige commissionRate verificado en Firestore | providerCommunicationService, providerPayoutPolicy | dispatchServiceOrder con 310 | Alto operativo: bloquea despacho a proveedores sin comisión registrada | Sí, con decisión del dueño, rebase sobre 310 |
| 310 | = 308 + despacho dispatch_pending→transport_accepted, reintenta mismo ID, exige Firestore y email antes de crear orden | providerCommunicationService, notificationService | 308 (superset), 309 | Medio | Sí (sustituye 308) |
| 311 | Fix: rol owner bloqueado en commerceAdminRouter (403); ahora owner|admin | commerceAdminRouter | 312 (hunks cercanos) | Bajo | Sí |
| 312 | Preflight comercial read-only (proveedores con tasa+correo, ofertas, cupos futuros, transporte email, pasarela, follow-up) | commerceReadinessPolicy(nuevo), commerceAdminRouter, CommerceOperationsPanel | 311 | Bajo (+1 query availability_slots: puede requerir índice) | Sí, tras 311 |
| 313 | Reglas de conocimiento de venta (estados distintos, no 85/15, WhatsApp solo tras triaje) | agentSkillPack | Ninguno | Bajo técnico; cambia política comercial | Sí, con decisión del dueño |

## Orden recomendado
307 → 303, 304, 313 (independientes) → 310 (cerrar 308) → 309 (rebase) → 311 → 312 → 300 → 305 → 301 (rebase por Page/admin.ts/snapshot).
Decisión del dueño: 309 (comisión por proveedor obligatoria), 310/308 (elegir y configurar SMTP/Resend/SendGrid), 313 (WhatsApp humano solo tras triaje), 301 vs 305 vs crt-admin (qué vista de dirección se queda), 311 (owner publica ofertas).

## crt-admin (sin commit, base #292, atrasado 4 commits vs main)
Aporta y JARVIS no tiene:
- adminMetricsService.computeLeadMetrics: agregados server-side 90 días/5000 leads (embudo actual/alcanzado, 1ª respuesta, por tour/región/idioma/fuente, heatmap, consentimiento, estancados). Main solo calcula en el cliente con 200 leads. → Integrar como sección `leads` de getAdminControlCenterSnapshot (o función exportada de adminControlCenterService), y que 305 la consuma como evidencia; no crear /api/admin/metrics paralelo.
- adminProcessRegistry: heartbeat persistente por cron (admin_processes/admin_runs, salud stale/no_signal según intervalo esperado), catálogo de 19 procesos. Main: cronEngine sin último-run persistente; nativeAutomationEngine solo 200 eventos en memoria (lo admite 300). → Envolver jobs de cronEngine con trackProcessRun dentro de nativeAutomationEngine/cronEngine; persistir vía agentRunLedgerService (o colección de procesos junto a agentRuns) y exponer en Mission Control (301) en vez de routes/commandCenter.ts.
- getGithubWorkflowRuns (CI/deploy) → sub-bloque de Mission Control.
- aiRouter getAiCallStats (p50/p95, fallos por proveedor, por instancia) → mismo patrón "instance scope" de 300; añadirlo a adminControlCenterService.
- Descartar/duplica: routes/commandCenter.ts, recordAdminEvent (solapa operationalEventBus + ownerApprovals/jarvisPlans).

## Brechas E2E (lead→admin)
- Lead: real (Firestore `leads`, leadPipeline). Follow-up automático apagado (LEAD_AUTOFOLLOWUP_ENABLED).
- Triaje: real determinista (leadTriageOf); IA depende de proveedor configurado.
- Cotización: precio de referencia de catálogo; oferta/cupo fechado solo si publicados en Firestore (312 muestra que probablemente faltan). Soft-hold TTL/liberación sin implementar (#175).
- Proveedor: despacho real solo con proveedor verificado + email; hoy el correo puede "salir" simulado (hasta 308/310); 85/15 inventado (hasta 309). Respuesta: portal con token o Gmail inbox (requiere GMAIL_*; no probado en prod).
- Pago: Stripe/PayPal webhooks existen; sin prueba sandbox E2E ni conciliación (cobros = N/D).
- Confirmación/correo: sendEmail devuelve éxito simulado sin transporte (main); varios llamadores ignoran el resultado (nativeWorkflows 1481/1568/1662/1762, emailOperationsAgent, providerInboxAgent, providerComm:600). .agents/AGENTS.md aún ordena decir "voucher QR ha comenzado".
- Admin: en main revenue = valor de reservas, 24 workflows y 100% éxito ficticios (300 corrige); clima fallback sintético (303 corrige).

## Artefacto read-only-ui-audit-39459191786 (descargado)
Resumen: 59 rutas, 7 perfiles, 0 críticos/altos, 7 medios, 0 HTTP error.
1. /blog (desktop): 2 recursos 404 en consola.
2–7. scroll-unreachable (desktop, root:visible, scroll 111px sin llegar al fondo): /admin, /admin/ai-command, /admin/ai-architecture, /admin/email-operations, /admin/financial-legal, /ops. Todas protegidas y mismo bodyLength (~1094) → es la pantalla de login común, no los módulos: un solo defecto real de layout/scroll en el gate de login. Requiere prueba autenticada.
Archivos: artefacto de GitHub Actions del run indicado (report.json + PNGs).
