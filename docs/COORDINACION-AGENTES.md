# Coordinación multiagente — Costa Rica Tours 2026

> Documento vivo para que varios agentes (Hark, ChatGPT/Codex u otros) y el dueño trabajen **en paralelo sin chocar**.
> Última actualización: 2026-10-20. Base: `main` en `3e83bee` (#314).
> Repositorio **público**: nada de secretos, ids de secretos, números de proyecto, cuentas de servicio, teléfonos/correos personales, nombres o contactos de proveedores/operadores ni datos de leads en issues, PRs, commits o docs.

## 1. Reglas fijas (no negociables)

1. **No inventar** precios, disponibilidad, cupos, operadores, reseñas, certificaciones ni métricas. Si no hay fuente: `null` / "no disponible" / "por validar".
2. **Gasto $0** sin autorización explícita del dueño (APIs de pago, números WhatsApp, planes, dominios, servicios nuevos).
3. **El cliente nunca ve al proveedor**: ni nombre, oficina, teléfono, correo, WhatsApp, web, logo ni enlaces de fuente (ver `AGENTS.md` §12 y `tests/publicOperatorPrivacy.contract.test.ts`).
4. **Sin contactos de negocios en el sitio** público, salvo números oficiales de emergencia (911, etc.).
5. **Ley 8968** (protección de datos, PRODHAB): consentimiento antes de guardar contacto, minimización, sin PII en logs, dashboards ni respuestas de IA.
6. **No tocar Stripe/PayPal ni `api/[...path].ts`** sin autorización explícita del dueño en el issue/PR.
7. **PR pequeño + squash merge** solo con **CI verde**. Un tema por PR.
8. **Ramificar siempre de `origin/main` actual** (`git fetch && git checkout -b <rama> origin/main`). Rebase antes de merge si `main` avanzó.
9. **Nunca `force-push` a `main`**. En ramas propias, solo `--force-with-lease`.
10. **Snapshot de rutas**: si choca `tests/serverRoutes.contract.test.ts`, regenerar con `UPDATE_ROUTE_SNAPSHOT=1 npx vitest run tests/serverRoutes.contract.test.ts` sobre la rama ya rebasada y revisar el diff (solo rutas esperadas).
11. **Vercel plan gratis con límite de despliegues**: agrupar merges de frontend (varios PRs de UI en una ventana) y evitar merges triviales seguidos. Si el límite está agotado, no reintentar en bucle: esperar al reinicio.
12. **Máximo 2 reintentos** ante un fallo repetido; luego detenerse y reportar en el issue.
13. Nada de reembolsos, cambios de permisos, altas comerciales ni despliegues ejecutados por IA sin aprobación y auditoría.

## 2. Carriles de trabajo (dueños)

| Carril | Dueño | Alcance | Archivos principales |
|---|---|---|---|
| Observabilidad y métricas admin | **Hark** | Métricas de leads en servidor, heartbeat de crons, estadísticas de IA, Centro de Mando | `backend/adminControlCenterService.ts`, `backend/agentRunLedgerService.ts`, `backend/cronEngine.ts`, `backend/nativeAutomationEngine.ts`, `backend/aiRouter.ts`, `docs/admin/` |
| Diseños de producto y revisión | **Hark** | Portal de proveedores, WhatsApp, Digital Desk (diseño), revisión de PRs, QA read-only | `docs/diseno/`, `docs/revision-*.md` |
| JARVIS (gerencia, Mission Control, ventas) | **ChatGPT** | #301, #305, #312, #313 y sucesores | `backend/missionControlService.ts`, `backend/ownerExecutiveBriefingService.ts`, `backend/commerceReadinessPolicy.ts`, `backend/agentSkillPack*` |
| Comercio, frontend y UX | **ChatGPT** | Navegación responsive (#228), catálogo, mapa, fotos (#298) | `src/**`, `App.tsx` |
| Libre | quien lo reclame | Issues con etiqueta `agente:libre` | — |

**Archivos calientes** (los tocan varios carriles; coordinar en el issue antes de editarlos): `src/pages/AdminControlCenterPage.tsx`, `backend/routes/admin.ts`, `tests/__snapshots__` / snapshot de rutas, `backend/providerCommunicationService.ts`, `backend/notificationService.ts`.

## 3. Cómo reclamar una tarea

1. Buscar el issue (o crearlo si no existe; no duplicar).
2. **Asignarse** el issue y añadir la etiqueta **`en-curso`**; quitar `agente:libre` y poner `agente:hark` o `agente:gpt`.
3. Crear rama desde `origin/main` con prefijo **`hark/`** o **`gpt/`** (ej. `hark/leads-metrics-snapshot`).
4. Comentar en el issue el plan corto y los archivos que se tocarán.
5. PR con `Closes #N`; al fusionar, quitar `en-curso`.
6. Un issue con `en-curso` sin actividad en 48 h puede reclamarse avisando en un comentario.

Etiquetas: `agente:libre`, `agente:hark`, `agente:gpt`, `en-curso`, `prioridad:P0|P1|P2`, `area:<x>` (admin, proveedores, whatsapp, seguridad, auth, reservas, correo, ia, frontend, contenido, pagos, digital-desk, datos).

## 4. Decisiones del dueño YA tomadas (2026-10-20)

- **Comisión registrada obligatoria antes de despachar** a un proveedor (sin 85/15 ficticio). Hecho en #309.
- **El dueño publica ofertas** (rol owner en `commerceAdminRouter`). Hecho en #311.
- **Integrar login #284** (authDomain propio + proxy `/__/auth`). Bloqueado por el límite de despliegues de Vercel; al integrar, autorizar el dominio en Firebase Auth y en el cliente OAuth.
- **WhatsApp con tres modos**: Manual / Semiautomático (la IA redacta, el dueño aprueba) / Automático (el dueño observa y fiscaliza). Ver `docs/diseno/whatsapp-modos.md`.
- **Portal de proveedores** con ventas, comisiones, liquidaciones y gráficos, aislado por proveedor. Ver `docs/diseno/portal-proveedores.md`.
- **El proveedor ve solo su neto** en el portal: sin bruto, sin % ni monto de comisión (`PROVIDER_PORTAL_SHOW_GROSS=false`, `PROVIDER_PORTAL_SHOW_COMMISSION=false`). #347.
- **Digital Desk / Agent Desk**: tour desk digital para hoteles + marca blanca para agencias, como **app separada**. Ver `docs/diseno/digital-desk.md`.

## 5. Decisiones PENDIENTES (no implementar hasta que el dueño decida)

- Número de WhatsApp y método de pago en Meta.
- Nombre final del producto Digital Desk y hotel piloto.
- Repositorio nuevo privado para Digital Desk.
- #301 vs #305 (vs Centro de Mando): cuál es la vista de gerencia oficial.
- Revisión legal PRODHAB (inscripción de bases de datos, avisos).

## 6. Estado actual

### Integrados 19–20 oct 2026 (squash en `main`)
| PR | SHA | PR | SHA |
|---|---|---|---|
| #288 | `2170a66` | #294 | `6922d12` |
| #289 | `0a2b55f` | #299 | `f494d89` |
| #290 | `8e4831e` | #297 | `e051ed8` |
| #281 | `fd675a9` | #307 | `a45d147` |
| #291 | `15fb117` | #303 | `ef9b6ee` |
| #292 | `4f3c221` | #304 | `1a0b9cd` |
| #293 | `2c8f2f9` | #310 | `5e8062c` |
| #295 | `698a830` | #300 | `82ad644` |
| #296 | `49b5891` | #309 | `299c528` |
| #311 | `2d5921b` | #314 | `3e83bee` |

### Abiertos (2026-10-20)
- #284 login (authDomain + proxy) — decidido integrar; bloqueado por Vercel.
- #301 Mission Control, #305 gerencia ejecutiva — pendiente decisión de vista oficial; comparten `AdminControlCenterPage.tsx`, `routes/admin.ts` y snapshot.
- #312 preflight comercial (tras #311; puede requerir índice en `availability_slots`).
- #313 reglas de conocimiento de ventas.
- #228 navegación responsive consolidada.
- #298 fotos Wikimedia Commons (borrador, revisión humana).

## 7. Documentos de referencia
- `docs/revision-jarvis-prs-2026-10-20.md` — revisión de PRs #300–#313 y brechas E2E.
- `docs/auditoria-integrada-jarvis-2026-10-20.md` — auditoría y orden de integración.
- `docs/estado-real-del-sistema.md` — estado real del sistema.
- `docs/admin/centro-de-mando.md` — diseño del Centro de Mando (`/admin`).
- `docs/diseno/` — portal de proveedores, WhatsApp, Digital Desk.
