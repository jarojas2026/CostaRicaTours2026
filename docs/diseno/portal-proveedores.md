# Portal de Proveedores — Diseño de producto y arquitectura

**Proyecto:** Costa Rica Tours (Zanibentech) · **Dueño:** propietario del proyecto · **Fecha:** 2026-10-20 · **Estado:** propuesta (documento de diseño)

Base revisada: `main` (commit `2c8f2f9`). Archivos clave: `backend/providerPortalService.ts`, `backend/routes/provider.ts`, `backend/providerAcceptance.ts`, `backend/providerPayoutPolicy.ts`, `backend/providerPayoutService.ts`, `backend/ownerApprovalService.ts`, `backend/agentRunLedgerService.ts`, `backend/operationalEventBus.ts`, `firestore.rules`, `src/pages/ProviderPortalPage.tsx`.

---

## 1. Punto de partida (lo que ya existe)

| Pieza | Qué hace hoy | Implicación |
|---|---|---|
| `providerPortalService.ts` | Token HMAC firmado por **una orden + un proveedor**, TTL 5 min–7 días (`PROVIDER_ACTION_SECRET`). | Buen modelo de "enlace mágico por orden". No hay cuenta persistente del proveedor. |
| `GET /api/provider/portal` | Devuelve la orden de `service_orders` si `providerId` coincide. | **Brecha:** devuelve `customer: order.customer` completo. Debe minimizarse (ver §5). |
| `POST /api/provider/portal/action` | Aceptar/rechazar con el token. | Se reutiliza tal cual como lógica de dominio. |
| `providerAcceptance.ts` | Transacción que valida `providerId` en orden y booking y solo confirma si el pago está verificado. | Regla "no confirmar sin evidencia" ya codificada. Se mantiene. |
| `providerPayoutPolicy.ts` / `providerPayoutService.ts` | Liquidación solo si `paymentStatus=completed`, proveedor confirmó, tour ya ocurrió; `payout = totalUSD × (1 − commissionRate)`; PayPal batch; escalación si perfil no verificado. | La fuente de verdad de comisiones y liquidaciones ya existe en `bookings`. El portal **lee**, nunca calcula distinto. |
| Colecciones | `operators` y `proveedores` (ambas leídas por payouts), `service_orders`, `bookings`, `reviews`, `escalations`. | Hay **dos colecciones de proveedor**. Decisión necesaria (§11). |
| `firestore.rules` | `bookings` solo dueño/admin; `leads` admin/operador; `reviews` creadas solo por el viajero dueño del booking. | Base sólida; falta rol `provider`. |

**Principio del diseño:** el portal es una **vista de solo lectura sobre datos que el backend ya produce**, más dos acciones (aceptar/rechazar y actualizar datos operativos). No introduce un segundo cálculo de precios, comisiones ni disponibilidad.

---

## 2. Objetivos y no-objetivos

**Objetivos**
1. Cada proveedor entra con su cuenta (no solo enlace por orden) y ve su perfil, solicitudes pendientes, ventas, comisiones, liquidaciones, calificaciones y gráficos.
2. Acepta/rechaza solicitudes desde el portal (o desde el enlace mágico existente).
3. Aislamiento estricto por tenant: un proveedor jamás ve datos de otro.
4. Minimización de datos del cliente (Ley 8968): solo lo necesario para operar el servicio.
5. Cada número mostrado es trazable a documentos fuente (bookings/órdenes/reviews) y a una versión de cálculo.

**No-objetivos (MVP)**
- El proveedor no edita precios públicos ni disponibilidad que se muestre al cliente sin aprobación del dueño (`ownerApprovalService`).
- El proveedor no contacta directamente al cliente fuera del canal CRT (regla: el cliente nunca ve al proveedor).
- Sin pagos nuevos: el portal **muestra** liquidaciones; la ejecución de payouts sigue en el job actual con sus guardas.

---

## 3. Roles y permisos

Autenticación: Firebase Auth (ya usado en `authMiddleware.ts` con `verifyIdToken`). Autorización: **custom claims** firmados por el backend.

```json
{ "role": "provider", "providerId": "prov_abc123", "providerRole": "owner" }
```

| Rol | Quién | Puede |
|---|---|---|
| `provider.owner` | Titular del negocio | Todo lo del proveedor: ver ventas, comisiones, liquidaciones, datos bancarios (enmascarados), invitar/quitar miembros, aceptar/rechazar. |
| `provider.manager` | Encargado de operaciones | Ver solicitudes y órdenes, aceptar/rechazar, asignar guía/vehículo, ver métricas. **No** ve liquidaciones ni datos de pago. |
| `provider.staff` | Guía/chofer | Ver solo las órdenes asignadas a él (manifiesto del día). Sin montos. |
| `admin` / owner CRT | El dueño | Todo, vía panel admin existente. Puede "ver como proveedor" (impersonación de solo lectura, auditada). |

Reglas transversales:
- Un usuario pertenece a **un** `providerId` (MVP). Multi-proveedor por usuario queda fuera.
- Alta de proveedor y de su owner: solo admin (crea `provider_members` + claims). Invitaciones posteriores las hace el owner; requieren aceptación por email.
- Los claims se revocan al dar de baja (`revokeRefreshTokens` + borrar claim); verificación con `verifyIdToken(token, true)` para chequear revocación, igual que `digitalCityApplicationRouter.ts`.

---

## 4. Funcionalidad (pantallas)

1. **Inicio** — tarjetas: solicitudes pendientes (con SLA restante), servicios de hoy/mañana, ventas del mes (USD neto), próxima liquidación, calificación promedio (n reseñas).
2. **Solicitudes** — lista `dispatched/reassigned` con cuenta regresiva SLA (`slaDeadline` ya existe). Acciones: **Aceptar** (con guía/vehículo/notas) o **Rechazar** (motivo obligatorio de lista: sin cupo, clima, mantenimiento, otro). Rechazo dispara reasignación interna; el cliente no se entera de quién rechazó.
3. **Órdenes** — calendario/listado de confirmadas, completadas, canceladas. Manifiesto por fecha (exportable a PDF/CSV, solo campos minimizados).
4. **Ventas y comisiones** — por mes y por servicio: bruto (precio de venta CRT), comisión CRT, neto proveedor. Ver §6 para decisión sobre mostrar el bruto.
5. **Liquidaciones** — períodos, estado (`pending_eligibility`, `eligible`, `processing`, `paid`, `blocked` + motivo legible del `PayoutEligibilityReason`), detalle por línea con `bookingId` corto, comprobante (batchId PayPal enmascarado).
6. **Calificaciones** — promedio, distribución 1–5, comentarios (sin apellido ni datos del viajero), solo reseñas válidas (§7).
7. **Gráficos** — ventas por mes (barras), ventas por servicio (barras horizontales), embudo de conversión, calificación en el tiempo (línea). Cada gráfico con "Ver fuente" → lista de órdenes que lo componen.
8. **Perfil** — datos del negocio, licencias (ICT, póliza), contacto operativo, datos de pago (solo últimos 4 dígitos/email PayPal enmascarado; el cambio requiere aprobación del dueño).
9. **Equipo** (owner) — invitar/quitar miembros.

---

## 5. Minimización de datos del cliente (Ley 8968)

El proveedor recibe **solo lo necesario para prestar el servicio**:

| Campo | Proveedor ve | Justificación |
|---|---|---|
| Nombre | Nombre + inicial del apellido ("María G.") | Identificar al viajero en el punto de encuentro. |
| Pax | Adultos/niños, edades de niños si el tour lo exige | Capacidad y seguridad. |
| Fecha/hora, punto de recogida, `wazeUrl` | Sí | Operación. |
| Idioma | Sí | Asignar guía. |
| Notas operativas | Restricciones alimentarias, movilidad, condición médica **declarada para el tour** | Seguridad; marcado como dato sensible, visible solo para la orden activa. |
| Teléfono / email / pasaporte | **No** | Contacto vía canal CRT (relay). Emergencia día del tour: botón "contactar a CRT" con número 24/7. |
| Precio pagado por el cliente | Según decisión §6 | — |

Implementación: el backend escribe una **proyección** `provider_orders/{orderId}` con solo esos campos. Las reglas de Firestore no pueden filtrar campos, por eso el proveedor **nunca** lee `service_orders` ni `bookings` directamente. Las notas sensibles se borran de la proyección 7 días después del servicio (retención mínima; plazo por validar con asesoría legal).

Cambio obligatorio al endpoint actual: `GET /api/provider/portal` debe dejar de devolver `order.customer` completo y devolver la misma proyección minimizada.

---

## 6. Comisiones, liquidaciones y precios

- **Fuente única:** `bookings.totalUSD`, `operators.commissionRate` (o `proveedores.comision`), `bookings.payoutAmountUSD`, `bookings.payoutStatus`. El portal no recalcula; muestra lo que escribió `providerPayoutService`.
- Para líneas aún no liquidadas, el portal muestra **"neto estimado"** con la misma fórmula (`totalUSD × (1 − commissionRate)`), etiquetado como estimado y con la `commissionRate` vigente.
- **Decisión del dueño:** ¿el proveedor ve el precio de venta al cliente (bruto) y el % de comisión, o solo su **neto**? Recomendación: mostrar neto + % de comisión pactado (transparencia contractual) y **no** el bruto por línea si CRT aplica márgenes variables. Por validar contra los contratos.
- **Implementado (#321):** bandera `PROVIDER_PORTAL_SHOW_GROSS` (por defecto `false`). Con `false` el portal muestra **solo neto + % de comisión pactada**; el bruto (`grossUSD`) y la comisión en USD no salen del servidor. Con `true` se añaden. Nota: con neto y % visibles el bruto es deducible aritméticamente; si el dueño quiere ocultarlo del todo, habría que ocultar también el %.
- Liquidación agrupada: `provider_settlements/{providerId_YYYYMM}` con líneas referenciando `bookingId`, generada por un job idempotente que solo lee el estado de payout existente.

---

## 7. Métricas con fuente verificable

Toda métrica tiene: **definición escrita**, **colección fuente**, **filtro**, **versión de cálculo** (`metricsVersion`) y **lista de IDs fuente** accesible.

| Métrica | Definición | Fuente |
|---|---|---|
| Ventas del mes (neto) | Σ `payoutAmountUSD` (o neto estimado) de bookings con `providerId`, `paymentStatus=completed`, fecha de servicio en el mes | `bookings` |
| Ventas por servicio | Igual, agrupado por `tourId` | `bookings` |
| Tasa de aceptación | aceptadas / despachadas en el período | `service_orders` (status + timestamps) |
| Tiempo de respuesta | mediana (`confirmedAt − dispatchedAt`) | `service_orders` |
| Cumplimiento SLA | % respondidas antes de `slaDeadline` | `service_orders` |
| Conversión del servicio | despachadas → aceptadas → pagadas → completadas (embudo) | `service_orders` + `bookings` |
| Vistas→solicitud | **Por validar**: requiere eventos de analítica por `tourId` que hoy no confirmé en el repo. No se muestra hasta tener fuente. | `webhook/evento-analitica` (revisar) |
| Calificación | promedio y n de `reviews` cuyo `bookingId` existe, pertenece al proveedor, servicio en el pasado, y no está moderada | `reviews` + `bookings` |
| Cancelaciones | % canceladas por proveedor vs por cliente | `bookings.lifecycle` |

Cálculo: job diario (Cloud Scheduler → endpoint interno con `hasInternalJobToken`) que escribe `provider_metrics_monthly/{providerId_YYYYMM}` con `{values, sourceIds[] (o hash + conteo si >500), computedAt, metricsVersion}`. El portal muestra "Calculado el … · ver N órdenes fuente". Si una métrica tiene n<5 se muestra "datos insuficientes" en vez de un porcentaje engañoso.

Calificaciones "reales": solo reseñas creadas por el viajero dueño del booking (ya garantizado por `isValidReview` + regla de `reviews`), del servicio de ese proveedor. Sin reseñas importadas ni editadas por el proveedor. El proveedor puede **responder** (campo separado, moderado) pero no borrar.

---

## 8. Modelo de datos Firestore (nuevo)

```
provider_members/{uid}
  providerId, providerRole: owner|manager|staff, status: active|invited|revoked,
  email, displayName, invitedBy, createdAt, updatedAt

provider_profiles/{providerId}         # vista pública-para-el-proveedor del perfil canónico
  legalName, tradeName, ictLicense, insuranceExpiresAt, opsContact{name,phone},
  payoutMethod{type:'paypal', maskedAccount:'u***@example.com'}, commissionRate,
  status: active|suspended, sourceCollection: 'operators'|'proveedores', updatedAt

provider_orders/{orderId}              # PROYECCIÓN minimizada (escrita solo por backend)
  providerId, bookingRef (corto, no el bookingId interno si se prefiere),
  tourId, tourName, date, time, pax{adults,children,childAges[]},
  pickup{label, wazeUrl}, language, guestDisplayName ('María G.'),
  opsNotes (sensible, TTL), status, slaDeadline, assignedGuide, assignedVehicle,
  assignedStaffUid?, netEstimateUSD?, updatedAt, projectionVersion

provider_settlements/{providerId_YYYYMM}
  providerId, period, lines[{bookingRef, serviceDate, netUSD, status, reason?}],
  totals{eligibleUSD, paidUSD, blockedUSD}, payoutBatchRefMasked, computedAt

provider_metrics_monthly/{providerId_YYYYMM}
  providerId, period, values{...}, sourceIds[] | sourceHash+count, metricsVersion, computedAt

provider_reviews/{reviewId}            # proyección de reviews válidas del proveedor
  providerId, tourId, rating, comment, authorDisplay ('María G.'), serviceDate,
  providerReply?, moderated: bool

provider_audit/{eventId}
  providerId, actorUid, actorRole, action, targetId, before?, after?, ip?, at
```

Índices: `provider_orders (providerId, status, date)`, `provider_orders (providerId, assignedStaffUid, date)`, `provider_settlements (providerId, period desc)`.

Escritura de proyecciones: en los mismos puntos donde hoy se escribe `service_orders` (despacho, aceptación, reasignación, cancelación) + emisión de `emitOperationalEvent('provider.order.projected', …)`. Script de backfill con `--dry-run` por defecto.

---

## 9. Endpoints (Express 5, Cloud Run)

Middleware nuevo `requireProvider(roles?)`: verifica ID token (`checkRevoked=true`), exige `role=provider` y `providerId`; inyecta `req.provider = {uid, providerId, providerRole}`. **El `providerId` nunca se toma del body/query.**

| Método y ruta | Rol mínimo | Descripción |
|---|---|---|
| `GET /api/provider/v2/me` | staff | Perfil, rol, proveedor. |
| `GET /api/provider/v2/requests?status=pending` | manager | Solicitudes pendientes (proyección). |
| `POST /api/provider/v2/orders/:orderId/accept` | manager | Reutiliza `acceptProviderOrder(db, orderId, req.provider.providerId, details)`. Idempotente por `Idempotency-Key`. |
| `POST /api/provider/v2/orders/:orderId/reject` | manager | Motivo obligatorio; dispara reasignación y alerta al dueño. |
| `PATCH /api/provider/v2/orders/:orderId/ops` | manager | Guía/vehículo/notas internas. |
| `GET /api/provider/v2/orders?from&to` | staff (staff solo asignadas) | Órdenes/manifiesto. |
| `GET /api/provider/v2/settlements?period` | owner | Liquidaciones. |
| `GET /api/provider/v2/metrics?period` | manager | Métricas + `sourceCount`. |
| `GET /api/provider/v2/metrics/:metric/sources?period` | manager | IDs fuente (proyección). |
| `GET /api/provider/v2/reviews` | manager | Reseñas válidas. |
| `POST /api/provider/v2/reviews/:id/reply` | owner | Respuesta (pasa por moderación). |
| `POST /api/provider/v2/members/invite` · `DELETE …/members/:uid` | owner | Equipo. |
| `POST /api/provider/v2/profile/change-request` | owner | Cambios sensibles (datos de pago, comisión) → `requestOwnerApproval` → el dueño aprueba. |
| `POST /api/admin/providers/:providerId/members` | admin | Alta de owner + claims. |

Compatibilidad: `GET/POST /api/provider/portal*` (enlace mágico) se conserva, pero devolviendo la proyección minimizada.

Toda mutación: escribe `provider_audit` y `emitOperationalEvent` (`provider.order.accepted|rejected`, `provider.member.invited`, …). Rate limit por `uid`.

---

## 10. Reglas de seguridad Firestore (borrador)

```
function isProvider() {
  return isSignedIn() && request.auth.token.role == 'provider'
      && request.auth.token.providerId is string;
}
function myProvider() { return request.auth.token.providerId; }
function providerRole() { return request.auth.token.providerRole; }

match /provider_orders/{orderId} {
  allow read: if isAdmin() || (isProvider()
     && resource.data.providerId == myProvider()
     && (providerRole() in ['owner','manager']
         || resource.data.assignedStaffUid == request.auth.uid));
  allow write: if isAdmin();          // escritura real solo vía backend (Admin SDK)
}
match /provider_settlements/{id} {
  allow read: if isAdmin() || (isProvider() && providerRole() == 'owner'
                 && resource.data.providerId == myProvider());
  allow write: if isAdmin();
}
match /provider_metrics_monthly/{id} {
  allow read: if isAdmin() || (isProvider() && providerRole() in ['owner','manager']
                 && resource.data.providerId == myProvider());
  allow write: if isAdmin();
}
match /provider_reviews/{id} {
  allow read: if isAdmin() || (isProvider() && resource.data.providerId == myProvider());
  allow write: if isAdmin();
}
match /provider_members/{uid} {
  allow read: if isAdmin() || (isProvider() && request.auth.uid == uid)
              || (isProvider() && providerRole() == 'owner' && resource.data.providerId == myProvider());
  allow write: if isAdmin();
}
match /provider_profiles/{providerId} {
  allow read: if isAdmin() || (isProvider() && providerId == myProvider());
  allow write: if isAdmin();
}
match /provider_audit/{id} { allow read, write: if isAdmin(); }
// service_orders, bookings, leads: SIN acceso para role == 'provider' (no se añaden reglas).
```

Nota: las consultas del cliente deben incluir `where('providerId','==', myProvider())`; Firestore rechaza consultas que podrían devolver documentos no permitidos. Recomendación: el frontend del portal lee **solo vía API** en el MVP (más fácil de auditar) y las reglas quedan como defensa en profundidad.

Tests de contrato (siguiendo el patrón de `tests/permissionsAndRules.contract.test.ts`): proveedor A no lee órdenes de B; staff no lee órdenes no asignadas; manager no lee settlements; ningún proveedor lee `bookings`/`leads`/`service_orders`; `providerId` del body se ignora.

---

## 11. Riesgos y decisiones pendientes

| # | Tema | Recomendación |
|---|---|---|
| D1 | `operators` vs `proveedores` (dos colecciones) | Elegir `operators` como canónica; `provider_profiles.sourceCollection` mientras se migra. |
| D2 | ¿Proveedor ve bruto por línea? | Solo neto + % pactado. |
| D3 | Contacto con el viajero | Siempre vía relay CRT. Excepción el día del tour: decisión del dueño. |
| D4 | Retención de notas sensibles | 7 días post-servicio (por validar legalmente). |
| D5 | Librería de gráficos | No hay ninguna en `package.json`. Recomiendo SVG propio (4 gráficos simples) para no inflar el bundle; alternativa `recharts`. |
| R1 | Brecha actual: portal devuelve `customer` completo | Corregir en PR-1 (riesgo legal hoy). |
| R2 | Métrica de conversión de vistas sin fuente | No mostrar hasta instrumentar. |
| R3 | Costo | Firestore/Cloud Run dentro de uso actual; sin servicios pagos nuevos. Firebase Auth email/contraseña sin costo extra en volúmenes bajos (por validar contra el plan del proyecto). |

---

## 12. MVP en PRs pequeños

| PR | Alcance | Pruebas |
|---|---|---|
| **PR-1** | Minimizar respuesta de `GET /api/provider/portal` (quitar `customer` completo → `guestDisplayName`, pax, notas operativas). | Test de contrato: la respuesta no contiene email/teléfono. |
| **PR-2** | `requireProvider` + endpoint admin para alta de owner (claims + `provider_members`). | Unit: token sin claim → 403; `providerId` de body ignorado. |
| **PR-3** | Proyección `provider_orders` escrita en despacho/aceptación/reasignación/cancelación + script backfill `--dry-run`. | Unit de la función de proyección (campos permitidos, lista blanca). |
| **PR-4** | `GET requests/orders` + `POST accept/reject` (reutiliza `acceptProviderOrder`), idempotencia, `provider_audit`, eventos. | Contrato: aceptar sin pago verificado no confirma booking (ya cubierto, ampliar). |
| **PR-5** | Reglas Firestore nuevas + tests de aislamiento. | Emulador. |
| **PR-6** | Job `provider_metrics_monthly` + `provider_settlements` (solo lectura del estado de payout). | Unit: n<5 → "insuficiente"; sourceIds coinciden. |
| **PR-7** | UI: login proveedor, Inicio, Solicitudes, Órdenes (reemplaza/extiende `ProviderPortalPage.tsx`). | Playwright: aceptar/rechazar. |
| **PR-8** | UI: Ventas/Liquidaciones/Calificaciones + 4 gráficos SVG con "Ver fuente". | Playwright + snapshot. |
| **PR-9** | Equipo (invitaciones) y solicitudes de cambio de perfil vía `ownerApprovalService`. | Contrato: cambio de datos de pago requiere aprobación. |

Orden sugerido: PR-1 primero (cierra la brecha legal), luego 2→5 (seguridad), 6→9 (valor visible). Gasto: $0 previsto.

---

## 13. Estado de implementación

| Issue | Qué quedó | Archivos |
|---|---|---|
| #319 | Rol `provider` (claims `role/providerId/providerRole`), `requireProvider(rol)` con `checkRevoked` + membresía activa en `provider_members`, alta/baja admin auditada en `agent_audit_log`, acceso a datos acotado por tenant (404 si la orden es de otro proveedor), reglas Firestore `provider_*`, contratos A≠B. | `backend/providerAuth.ts`, `backend/providerTenantScope.ts`, `backend/providerAudit.ts`, `backend/routes/provider.ts`, `firestore.rules`, `tests/providerTenantIsolation.contract.test.ts` |
| #320 | `GET /api/provider/v2/orders?status=pending|confirmed|closed|all`, `GET …/orders/:orderId` (staff+, staff solo asignadas) y `POST …/orders/:orderId/accept|reject` (manager+). Aceptar reutiliza `handleProviderAction → acceptProviderOrder`; rechazar exige motivo (`sin_cupo`, `clima`, `mantenimiento`, `otro` + notas), dispara la reasignación existente y alerta al dueño; si no hay alternativo, la orden queda `rejected` con alerta crítica. Idempotente por decisión (orden+proveedor) con cerrojo en `idempotency_keys`; auditoría en `agent_audit_log`. El proveedor que rechaza no ve a quién se reasignó. UI del portal v2 se agrupa con #321 (límite de despliegues de Vercel). | `backend/providerOrderActions.ts`, `backend/routes/provider.ts`, `tests/providerOrderActions.contract.test.ts` |
| #321 | `GET /api/provider/v2/sales?months=N` (manager+) y `GET /api/provider/v2/settlements?months=N` (solo owner), calculados en servidor desde `bookings` del tenant con pago verificado (no canceladas/reembolsadas) y la comisión registrada (#309); sin comisión → neto `null` y liquidación `blocked: commission_unavailable` (nunca un % por defecto). Neto = `payoutAmountUSD` pagado o estimado con `calculateContractualSettlementUSD`; estado de liquidación con `evaluatePayoutEligibility` (no paga nada). Bandera `PROVIDER_PORTAL_SHOW_GROSS=false`. UI v2 en `/provider/portal` sin token (sesión de proveedor): Solicitudes con aceptar/rechazar, Ventas con 2 gráficos SVG propios, Liquidaciones. El enlace con `?token=` sigue igual. | `backend/providerSalesService.ts`, `backend/routes/provider.ts`, `src/pages/ProviderPortalV2.tsx`, `src/components/provider/ProviderSvgCharts.tsx`, `src/pages/ProviderPortalPage.tsx`, `tests/providerSales.contract.test.ts` |
