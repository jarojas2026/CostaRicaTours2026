# Costa Rica Tours — Plan de ejecución: correos interactivos, cambios y posventa (22-10-2026)

> **Estado:** auditoría/plan, sin ejecución de reservas, pagos, correos ni cambio de permisos. Basado en main y chats recuperables. No incluye información personal de viajeros ni contactos de proveedores.

## Objetivo comercial

Una sola solicitud/jornada permite consultar, cotizar, verificar disponibilidad, pagar y atender la posventa. Desde el correo recibido, el viajero debe poder **Ver solicitud**, **Cambiar fecha o pasajeros**, **Agregar actividad/traslado/hotel**, **Hacer pregunta** o **Solicitar cancelación**. El proveedor debe poder **Responder orden**, **Pedir información**, **Proponer alternativa** y **Reportar incidencia**. Ningún link GET ejecuta modificaciones. Un correo enviado no significa reserva aceptada ni correo entregado.

## Infraestructura existente que SE DEBE reutilizar

- `backend/emailOperationsAgent.ts` (Gmail/Outlook, triage, memoria, registro de eventos); `backend/providerInboxAgent.ts` (respuestas Gmail).
- `backend/providerCommunicationService.ts`, `backend/providerOrderActions.ts`, `backend/routes/provider.ts`, `ProviderPortalV2` (orden, aceptación/rechazo, permisos tenant y cerrojo de idempotencia).
- `backend/businessGoalOrchestrator.ts`, `backend/omnichannelJourneyBridge.ts`, `backend/verificationTaskService.ts` (estado, memoria y tareas de verificación).
- `backend/routes/bookings.ts`, `bookingStateMachine.ts`, servicios de pagos/voucher existentes; `src/components/MyBookingsModal.tsx`.
- `backend/leadFollowUpSequence.ts`, `backend/notificationService.ts`, `backend/providerCustomerNotice.ts`, panel Admin/Mission Control y `agentRunLedgerService`.

**No crear otro CRM, motor de reservas, proveedor falso, tasa CRC o router IA.**

## Hallazgos verificados e hipótesis a comprobar

### P0-1. Duplicidad de lectores de correos de proveedores

`backend/cronEngine.ts` programa **dos** crons cada minuto: `provider-inbox-1m` y `email-operations-1m`. Ambos pueden leer Gmail, reconocer órdenes y llamar `handleProviderAction`; registran por mensaje en colecciones diferentes (`provider_inbox_events` y `email_operation_events`). Sus locks son independientes. Riesgo de procesamiento/notificación duplicados: **escenario a probar, no incidente confirmado**.

**Propuesta:** una sola ingesta por `(mailbox,provider,messageId)`, verificación del emisor y ledger compartido; el ruteo sigue llamando a los servicios actuales. Conservar el lector anterior en modo sombra sin side effects hasta comprobar compatibilidad. No borrar históricos.

### P0-2. Correos de cambio o consulta pueden perderse o clasificarse mal

El fallback sin Gemini en `emailOperationsAgent.classifyMail()` interpreta palabras como «confirmado»/«disponible» primero como `provider_response`, sin mirar remitente en esa fase. Correos `unknown` quedan `ignored` y son marcados leídos en `processEmailOperationsOnce`. La verificación posterior de proveedor utiliza `REGISTERED_PROVIDERS` estático; el despacho vivo usa proveedores verificados desde Firestore.

**Propuesta:** identidad y vínculo con `threadId / reference / journeyId` **antes** de intención. Los desconocidos relevantes se mantienen en `needs_human_review` con SLA; no se descartan silenciosamente. Probar respuestas en ES/EN, incluso «ahora somos 10», «cambiemos la fecha», «sí, confirmado», «no hay cupo» y frases con errores ortográficos.

### P0-3. Solicitudes de cambio/cancelación separadas de mutaciones

`backend/routes/bookings.ts` protege `PATCH /api/bookings/:id` con operador; no usar esa ruta para acciones directas desde un email. `riskyCustomerRequest()` incluye refunds/incidentales, pero no contempla explícitamente todas las variantes de `cancelación, cambio de fecha/pasajeros, traslado, servicio extra`; auditar todo uso de `allowMutations`.

**Propuesta técnica:** contrato `CustomerServiceRequest` vinculado al expediente (no reserva nueva), con `action = QUESTION | CHANGE_DATE | CHANGE_PARTY | ADD_SERVICE | SPECIAL_REQUIREMENT | CANCEL_REQUEST | COMPLAINT`, `status = received | identity_pending | awaiting_supplier | quote_revision | awaiting_customer_approval | approved | rejected | closed`, `idempotencyKey`, `correlationId`, actor autorizado, versión previa y cambio propuesto. Crear POST protegido por Firebase+propiedad del expediente (o sesión con reto/verificación adicional) con límites antiabuso; no exponer la identidad por un ID predecible. No crear estados finales en `bookings` hasta pasar la máquina existente y validación de precio/cupo, aprobación del viajero y política correspondiente. Cancelaciones, reembolsos y cobros siempre bajo puerta de control.

### P0-4. PII en alertas/logs e interpolación HTML de correos

Hallazgo revisado en `main`: `customerIntakeGateway.ts` incluye nombre/correo/teléfono y solicitud en alertas y metadatos; `emailOperationsAgent.ts` persiste from/to/subject en `email_operation_events`; `notificationService.ts` registra algunos destinatarios en logs SMTP. `providerCommunicationService.ts` inserta texto de pedido, cliente y punto de recogida directamente en HTML. Esto requiere límites de acceso, minimización, retención y escape HTML para campos no confiables. **No se ha constatado una fuga ni explotación real.**

**Corrección propuesta:** proyecciones de alertas con ID/estado sin datos personales en métricas, detalle únicamente para roles autorizados, logs sin correos/teléfonos; función central segura de HTML/texto con tests de XSS-in-email (`<img>` convertido a texto), URLs verificadas y links privados fuera de telemetría. Evitar PII en comentarios de GitHub.

### P1-4. Emails de verdad interactivos, no botones decorativos

`sendGmailReply` hoy responde `text/plain`; `providerCustomerNotice` da copys prudentes pero casi sin interacción. Proponer un **renderer de comunicación** ES/EN reutilizando `notificationService`, sin segundo motor. Correo responsive + versión texto, encabezado y referencia CRT, resumen editable, estado verdadero, “Siguiente paso” y una acción principal + enlaces secundarios a portal autenticado.

**Tipos:** acuse, cotización pendiente/verificada, propuesta de cambio, aceptación operativa no final, reserva final verificada, modificación solicitada, cancelación solicitada, decisión de cancelación, voucher y seguimiento.

**Seguridad:** botones llevan a pantalla con confirmación POST; jamás aceptar/cancelar/pagar por GET del enlace. Tokens de único propósito con TTL/revocación, sin PII en URL, sin envío de enlaces de proveedor al cliente. Preservar `Reply-To`, `Message-ID`, `In-Reply-To`/thread para continuidad.

### P1-5. Propuestas del proveedor, no confirmaciones automáticas

`ProviderPortalV2` ya permite aceptar/rechazar; link token permite además reportar demora. Ampliar a `PROPOSE_DATE`, `PROPOSE_TIME`, `REQUEST_DETAILS`, `COUNTER_OFFER`, `REPORT_DISRUPTION` sobre el tenant existente. Guardar versión y evidencia, validar tarifa/cupo, pedir aprobación del viajero cuando cambia el producto. **Propuesta recibida ≠ tour confirmado**.

### P1-6. Recuperación de ventas y tablero accionable

`leadFollowUpSequence.ts` construye T+0/2h/24h/72h, pero el runner es de borradores y devuelve `sent:0`: no anunciar automatización completa. Implementar después del ledger único envío idempotente, opt-out, control de frecuencia, estado de entrega y pausa al responder. Panel owner debe mostrar **quién espera a quién, qué se verificó, SLA, versión del presupuesto, última respuesta y próxima acción**, sin PII en agregados. Separar cotizaciones/retornos de pago/ingresos conciliados.

## Primer control operativo aplicado en PR de integración

La primera fase añade barreras P0 sin alterar las rutas ni el estado de reservas: el cron legado sólo se habilita mediante `PROVIDER_INBOX_LEGACY_ENABLED=true` con `EMAIL_OPERATIONS_ENABLED=false`. Por defecto el lector omnicanal queda como único proceso automático que consume Gmail. Para ejecutar acciones por respuesta de proveedor en correo se exige además `EMAIL_VERIFIED_PROVIDER_ACTIONS_ENABLED=true` y verificar la orden y el correo operativo del proveedor activo en Firestore. **Preferencia:** utilizar el portal firmado para acciones operativas; la identidad del remitente por sí sola no es suficiente. Los correos ambiguos quedan en revisión sin marcarse leídos; todo email de viajero impide `allowMutations` hasta un canal autenticado. No asumir que esta barrera certifica la entrega o la autenticidad criptográfica del emisor.

## Hoja de ruta (PR independientes y orden obligatorio)

1. `P0-email-ingress-ownership`: un único mensaje consumido por canal, normalizador + ledger / dispatcher; test simultaneidad y dos cron; preservar funciones existentes.
2. `P0-email-replies-intents`: sender/thread-first, cliente/provider con identidad verificada, catch de unknown y cola manual; test 15-20 escenarios reales anonimizados ES/EN.
3. `P0-customer-service-request`: tipos, validación, auth, propiedad de expediente, idempotencia y eventos; **solo solicitud**, nunca mutación de reserva por email; tests 401/403/409/concurrencia.
4. `P1-customer-email-actions`: renderer responsive, links a portal y estados honestos, multi-idioma, test visual + seguridad.
5. `P1-provider-proposals`: alternativas y preguntas dentro del portal actual; tests tenant, rol, precio, propuesta, aprobación y rechazo.
6. `P1-owner-work-queue`: bandeja única y SLA sin duplicar Admin/Mission Control; coordinar archivos calientes con Hark.
7. `P1-followups-with-ledger`: secuencias solo cuando correo/consentimiento verificados; pruebas de desuscripción, respuesta, reintentos y no duplicación.
8. `P1-end-to-end-sales-cert`: de consulta a proveedor, cotización, pago sandbox, voucher, cambio, cancelación/reembolso sandbox y conciliación. Sin proveedor/portal real, etiquetar **no certificado**.
9. `P2-cross-sell`: sugerir tour/traslado/hotel pertinente solo después de verificar fuente, compatibilidad logística y tarifa; sin ampliar supuestos como si fueran reservas.

## Test de aceptación crucial: «ahora somos 10»

La respuesta a un email enviado sobre **2 viajeros** debe (a) reconocer hilo y expediente, (b) registrar solicitud `CHANGE_PARTY=10` con versión, (c) acusar recibo sin cambiar ni confirmar reserva, (d) verificar cupo/operador/importe/traslado, (e) enviar nueva propuesta con acciones **Aceptar cambio / Pedir alternativa / Hacer pregunta**, (f) aplicar únicamente tras evidencia y autorización. No usar un correo de cliente como confirmación de proveedor.

Otros tests: respuesta «confirmado» remitida por cliente, propuesta de proveedor sin cupo, doble lectura simultánea, link expirado/reenviado, acceso a reserva ajena, cobro/reembolso bloqueado, email transport accepted pero no delivered, fallo OAuth sin IA, respuesta ambigua que entra a cola.

## Gobernanza, dependencias y coordinación

- Verificar [#317](https://github.com/jarojas2026/CostaRicaTours2026/issues/317) credencial de GCP y [#318](https://github.com/jarojas2026/CostaRicaTours2026/issues/318) login; sandbox de [#174](https://github.com/jarojas2026/CostaRicaTours2026/issues/174)/[#175](https://github.com/jarojas2026/CostaRicaTours2026/issues/175).
- Aprovechar [#190](https://github.com/jarojas2026/CostaRicaTours2026/issues/190) email IA-first, [#169](https://github.com/jarojas2026/CostaRicaTours2026/issues/169) CRM, [#327](https://github.com/jarojas2026/CostaRicaTours2026/issues/327) WhatsApp, [#331](https://github.com/jarojas2026/CostaRicaTours2026/issues/331) leads de prueba.
- [#409](https://github.com/jarojas2026/CostaRicaTours2026/pull/409) acuses/verificación: CI verde pero aún abierto al corte; fusionar con ventana y comprobar producción. [#405](https://github.com/jarojas2026/CostaRicaTours2026/pull/405) auth: CI verde, pero requiere E2E de acceso real. [#365](https://github.com/jarojas2026/CostaRicaTours2026/pull/365) UX: E2E rojo, no fusionar.
- Roles: ChatGPT/Astra integra journeys/frontend y contrato de solicitudes; Hark coordina métricas, ledger y owner dashboard; Dola/otros agentes reclaman issues sin solaparse. Leer `docs/COORDINACION-AGENTES.md`, no eliminar servicios.
- Cero gastos nuevos sin aprobación. No publicar secretos, operadores, teléfonos privados ni leads. Cada PR: lint, contratos, E2E con mocks, build, auditorías RBAC/privacy y revisión de SHA antes de squash merge.

**Fuentes de verificación:** `backend/cronEngine.ts`, `backend/emailOperationsAgent.ts`, `backend/providerInboxAgent.ts`, `backend/providerCommunicationService.ts`, `backend/providerOrderActions.ts`, `backend/routes/provider.ts`, `backend/routes/bookings.ts`, `backend/businessGoalOrchestrator.ts`, `backend/leadFollowUpSequence.ts`, `backend/providerCustomerNotice.ts` y pendientes accesibles en el repositorio. Casos históricos recuperables y ejemplos de correos recientes se utilizaron anonimizados; no constatan reservas ni proveedores efectivamente confirmados.
