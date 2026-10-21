# Atención por WhatsApp con IA y el dueño — Modos Manual / Semiautomático / Automático

**Proyecto:** Costa Rica Tours (Zanibentech) · **Dueño:** propietario del proyecto · **Fecha:** 2026-10-20 · **Estado:** propuesta (documento de diseño)

Base revisada en `main` (commit `2c8f2f9`): `docs/WHATSAPP_AI_GATEWAY.md`, `backend/routes/intake.ts` (`GET/POST /api/webhooks/whatsapp`, dedupe en `whatsapp_inbound_events`), `backend/customerIntakeGateway.ts` (`processCustomerIntake`, cola `enqueueCustomerIntakeJob` / `processPendingCustomerIntakeJobs`), `backend/notificationService.ts` (salida por Graph API `v19.0`, Twilio o webhook), `backend/ownerApprovalService.ts`, `backend/agentRunLedgerService.ts`, `backend/operationalEventBus.ts`, `backend/jarvisOrchestrator.ts`.

---

## 1. Resumen

Hoy ya existe la entrada oficial (webhook Meta con verificación de firma y deduplicación) que pasa por el mismo cerebro que la web. Falta: (a) un **interruptor de modo** global y por conversación, (b) una **bandeja de aprobación** de un toque para el dueño, (c) **guardas duras** para el modo Automático, (d) **auditoría y toma de control** instantánea, y (e) envío saliente con idempotencia y respeto de la ventana de 24 h.

Recomendación de canal: **WhatsApp Cloud API de Meta directa** (sin BSP). Es la opción con menor costo fijo ($0 de plataforma) y el código actual ya la usa. Ver §7.

---

## 2. Los tres modos

| Modo | Quién responde | Rol del dueño | Cuándo usarlo |
|---|---|---|---|
| **Manual** | El dueño (desde el panel CRT o desde la app WhatsApp Business si se usa coexistencia) | Operador | Clientes VIP, quejas, negociación, arranque del sistema. |
| **Semiautomático** (por defecto recomendado al inicio) | La IA **redacta**; nada sale hasta que el dueño toca **Enviar / Editar / Descartar** | Aprobador | Primeras semanas y toda conversación con intención de compra. |
| **Automático** | La IA responde sola dentro de límites | **Observador y fiscal**: auditoría, alertas, toma de control | FAQ, información de tours, logística ya confirmada, horas fuera de oficina. |

### 2.1 Interruptor

- **Global** (`whatsapp_settings/global.mode`): valor por defecto para conversaciones nuevas.
- **Por conversación** (`wa_conversations/{id}.mode` + `modeLockedBy`): sobrescribe al global. Si el dueño responde a mano en una conversación, esta pasa a **Manual** automáticamente por 2 h (configurable) para evitar que IA y humano se pisen.
- **Kill switch**: `global.automationPaused=true` congela todo envío de IA (los borradores se siguen generando para Semiautomático). Reutiliza la semántica de `agent.paused` / `agent.revoked` del `operationalEventBus`.
- Cambios de modo quedan en `agent_audit_log` (colección ya usada por `ownerApprovalService`).

### 2.2 Semiautomático: aprobación de un toque

1. Mensaje entrante → borrador IA → se crea `requestOwnerApproval({ action: 'whatsapp.send', payload: {conversationId, draftId} })`.
2. El dueño recibe una notificación (panel web PWA con push, y opcionalmente un mensaje a su WhatsApp personal con plantilla *utility* — tiene costo, ver §7) con tres botones: **Enviar**, **Editar**, **Descartar**.
3. **Enviar** → `approveOwnerApproval` → `consumeOwnerApproval` (consumo único; ya existe) → envío.
4. Si la ventana de 24 h está por vencer (<30 min) el borrador se marca **urgente**. Si vence, el envío solo puede hacerse con plantilla aprobada.

### 2.3 Automático: límites duros (no negociables en código)

La IA **nunca**:
1. Confirma un pago sin evidencia en el sistema (`bookings.paymentStatus='completed'` escrito por el webhook de pagos).
2. Confirma una reserva sin aceptación del proveedor registrada (`providerAcceptance.ts`) — "tu solicitud está en proceso" es lo máximo.
3. Da un precio o disponibilidad que no salga de `commerceCatalog` / `quotePrice` / `checkTourAvailability`; si la herramienta falla responde "lo confirmo y te escribo" y escala.
4. Revela el nombre o contacto del proveedor.
5. Promete reembolsos, descuentos o excepciones de política.
6. Pide datos de tarjeta por chat (solo enlace de pago seguro).

Escalado inmediato al dueño (y la conversación pasa a Semiautomático) cuando:
- el cliente pide humano ("agent", "persona", "hablar con alguien") — requisito de la política de WhatsApp (§6);
- se detecta queja, emergencia, salud, seguridad, menor de edad sin adulto, lenguaje legal ("abogado", "denuncia");
- confianza del triage < umbral, o 2 respuestas seguidas sin avance;
- monto > umbral (p. ej. > $500 — **por decidir el dueño**);
- cualquier herramienta de comercio devuelve error.

Implementación: un **guardián de salida** (`outboundPolicyGuard`) evalúa cada borrador **antes** del envío con reglas deterministas (regex + chequeos contra Firestore), no solo con el LLM. Si bloquea, el borrador se convierte en aprobación pendiente con el motivo.

### 2.4 el dueño como fiscal

- **Feed en vivo** de conversaciones automáticas con resaltado de riesgo.
- **Alertas**: escalados, bloqueos del guardián, cliente molesto (sentimiento), tasa de bloqueos > X%/h.
- **Toma de control instantánea**: botón "Tomar" → `mode=manual`, cancela envíos en cola de esa conversación (por `conversationId`), y la IA deja de responder.
- **Auditoría**: cada mensaje saliente guarda `{generatedBy: ai|human, model, promptVersion, toolsCalled[], guardVerdict, approvedBy?, runId}` enlazado a `agentRuns` (`agentRunLedgerService`).
- **Revisión diaria**: resumen de 10 conversaciones automáticas al azar para calificar (calidad, riesgo); alimenta ajustes de prompt.

---

## 3. Arquitectura

```
Meta Cloud API ──webhook──▶ Cloud Run: POST /api/webhooks/whatsapp
                               │ 1. verificar X-Hub-Signature-256 (ya existe)
                               │ 2. dedupe por message.id en whatsapp_inbound_events (ya existe)
                               │ 3. persistir mensaje en wa_conversations/{id}/messages
                               │ 4. encolar job (customer_intake_jobs, ya existe) → 200 OK rápido
                               ▼
                       Worker (processPendingCustomerIntakeJobs / Cloud Tasks)
                               │ consentimiento + modo + ventana 24 h
                               │ processCustomerIntake → triage → JARVIS/tools → borrador
                               │ outboundPolicyGuard
                     ┌─────────┼──────────────┐
                 Manual   Semiautomático   Automático
                (nada)  requestOwnerApproval  wa_outbox
                               │ aprobado           │
                               └──────▶ wa_outbox ◀─┘
                                          │ sender idempotente (clave = conversationId+draftId)
                                          ▼
                                 Graph API /{PHONE_NUMBER_ID}/messages
                                          │
              webhook de estados (sent/delivered/read/failed + pricing) → wa_messages.status, costo
```

### 3.1 Recomendaciones técnicas

- **Responder 200 rápido**: el POST no debe esperar al LLM. Hoy `WHATSAPP_AI_GATEWAY.md` dice que devuelve 200 "después de procesar"; Meta reintenta si no recibe 200 a tiempo, lo que puede duplicar trabajo. Mover el procesamiento a la cola existente.
- **Cola**: usar la de `customerIntakeGateway` (`customer_intake_jobs`) con `withDistributedAutomationLock`. Si crece, Cloud Tasks (por validar costo; Google publica una capa gratuita mensual — verificar cifra vigente antes de decidir).
- **Idempotencia**:
  - Entrada: `message.id` (ya).
  - Salida: `wa_outbox/{conversationId_draftId}` creado con `create()` (falla si existe); el sender marca `sending→sent` en transacción y guarda el `wamid` devuelto.
  - Aprobaciones: `consumeOwnerApproval` de un solo uso (ya).
- **Orden por conversación**: un solo worker por `conversationId` a la vez (lock por documento).
- **Ventana 24 h**: `wa_conversations.lastInboundAt`; si `now − lastInboundAt > 24 h`, solo plantillas aprobadas.
- **Versión Graph API**: `notificationService.ts` usa `v19.0`; verificar vigencia y parametrizar con `WHATSAPP_GRAPH_VERSION`.
- **Estados y costo**: procesar webhooks `statuses` con el objeto `pricing` (`billable`, `category`, `type`) para registrar el costo real por mensaje.

### 3.2 Modelo de datos

```
whatsapp_settings/global
  mode: manual|semi|auto, automationPaused: bool, autoHours?: {tz:'America/Costa_Rica', from, to},
  amountEscalationUSD, humanTakeoverMinutes, updatedBy, updatedAt

wa_conversations/{waId_hash}
  waIdHash, phoneE164 (cifrado o restringido), displayName, locale, mode, modeLockedBy,
  consent{marketing:bool, at, source, text}, lastInboundAt, lastOutboundAt,
  status: open|escalated|closed, leadId?, bookingRefs[], riskFlags[]

wa_conversations/{id}/messages/{wamid}
  direction: in|out, type, text, media?, generatedBy, model, promptVersion,
  toolsCalled[], guardVerdict, approvalId?, status, pricing{billable,category}, at

wa_outbox/{conversationId_draftId}
  status: queued|sending|sent|failed|cancelled, attempts, wamid?, lastError?

whatsapp_inbound_events/{message.id}     # ya existe (dedupe)
agent_approvals / agent_audit_log         # ya existen
```

Reglas: todas estas colecciones `allow read, write: if isAdmin()`; el navegador del panel lee vía API.

---

## 4. Consentimiento y Ley 8968

- **Atención (servicio)**: el cliente inicia la conversación; se le informa en el primer mensaje (texto corto + enlace a política de privacidad) quién es el responsable, finalidad y derechos (art. 5, consentimiento informado). Fuente: Ley 8968 texto en SCIJ — https://pgrweb.go.cr/scij/Busqueda/Normativa/Normas/nrm_texto_completo.aspx?nValor1=1&nValor2=70975&param1=NRTC
- **Marketing**: requiere opt-in explícito y separado (casilla/botón "Sí, quiero recibir ofertas"), guardado con texto y fecha. Meta también exige opt-in para enviar mensajes (https://developers.facebook.com/docs/whatsapp/pricing, sección *Customer service window*).
- **Leads**: se mantiene la regla actual (`consent === true` para guardar contacto, ver `routes/intake.ts`).
- **Inscripción PRODHAB**: el art. 21 exige inscribir bases "con fines de distribución, difusión o comercialización"; el canon anual es $200 (art. 33) según comunicado de PRODHAB: https://www.prodhab.go.cr/noticias/comunicados/2020/INSCRIPCIONBASESDEDATOSYPAGODECANON.pdf. Si CRT solo usa los datos para atender y no los comercializa, probablemente no aplique — **por validar con abogado**.
- **Transferencia internacional**: la ley tipifica como falta (inciso f del régimen sancionatorio; número de artículo por verificar en SCIJ) transferir datos de costarricenses/residentes a bases de terceros países sin consentimiento. Meta y Groq procesan fuera de CR → incluirlo en el aviso y en el consentimiento. **Por validar con abogado.**
- **Minimización hacia el LLM**: enviar a Groq solo el texto y contexto necesario; no enviar números de teléfono ni pasaportes; seudonimizar `waId`.
- **Retención**: mensajes 12 meses, luego anonimizar (plazo **por decidir**).
- **Derechos ARCO**: comando "BORRAR MIS DATOS" → crea tarea para el dueño; respuesta en el plazo legal (por validar).

---

## 5. Métricas del canal

Tiempo de primera respuesta, % resuelto sin humano, % escalado, bloqueos del guardián por regla, conversión conversación→solicitud→pago, costo Meta real por mes (desde `pricing` de webhooks), tokens/costo LLM por conversación (desde `agentRuns`).

---

## 6. Términos de WhatsApp relevantes (verificados)

- **Política de mensajería**: se puede usar automatización dentro de la ventana de 24 h, pero hay que tener "rutas de escalado claras y directas" (transferencia a humano en el chat, teléfono, email, web…). Fuente: https://whatsappbusiness.com/policy/ → cumple con el botón/comando "hablar con el dueño".
- **Proveedores de IA** (vigente desde 15-ene-2026): Meta prohíbe a los *AI Providers* ofrecer asistentes de IA de **propósito general** como funcionalidad principal; sí se permite que un negocio use IA para atender a **sus propios clientes**. Fuentes: https://www.whatsapp.com/legal/business-solution-terms y https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers. CRT es un negocio turístico que usa IA ancilar → permitido. El bot **no** debe responder temas ajenos al viaje (redirigir con cortesía).
- **Plantillas**: solo se puede **iniciar** conversación con plantilla aprobada; fuera de 24 h, solo plantillas. Fuente: página de precios de Meta (arriba).
- **Verificación del negocio**: la cuenta se crea en Meta Business Manager; la verificación del negocio amplía límites de envío. Requisitos documentales concretos para Zanibentech: **por validar** en el flujo de Meta.

---

## 7. Opciones de canal y costo real

### 7.1 Tarifas de Meta (vigentes desde 1-oct-2026)

Fuente oficial del modelo: https://developers.facebook.com/docs/whatsapp/pricing (consultada 2026-10-20). Puntos clave:
- Cobro **por mensaje entregado** del negocio al usuario; los mensajes del usuario al negocio **no se cobran**.
- Desde **1-oct-2026** Meta **volvió a cobrar los mensajes de servicio** (respuestas libres dentro de 24 h), con **1.000 mensajes de servicio gratis por mes por número**. También volvió a cobrar las plantillas *utility* enviadas dentro de la ventana.
- Mensajes dentro de una **ventana de entrada gratuita** (cliente llega desde un anuncio *Click-to-WhatsApp*) no se cobran hasta 7 días.
- Costa Rica (+506) está en la región **"Rest of Latin America"**; EE. UU./Canadá en **"North America"**.

Tarifas por mensaje (USD) según tarjeta de Meta del 1-oct-2026, reproducida por OmniChannels (BSP, sin margen): https://omnichannels.ai/whatsapp-pricing/rest-of-latin-america/ y https://omnichannels.ai/whatsapp-pricing/north-america/ — **validar contra el CSV oficial de Meta antes de presupuestar**.

| Destino del cliente | Marketing | Utility | Autenticación | Servicio (después de 1.000 gratis) |
|---|---|---|---|---|
| Costa Rica / Resto de LatAm | $0,0740 | $0,0113 | $0,0113 | $0,0113 |
| EE. UU. / Canadá | $0,0250 | $0,0034 | $0,0034 | $0,0034 |

Nota: la mayoría de viajeros de CRT tienen número extranjero (EE. UU. 56% de llegadas en 2024 según OCDE: https://www.oecd.org/en/publications/oecd-tourism-trends-and-policies-2026_3fd3cd75-en/full-report/costa-rica_203ff139.html), así que la tarifa de North America será la más frecuente. Europa tiene tarifas propias por país.

### 7.2 Comparativa de proveedores

| Opción | Costo fijo | Costo variable | Pros | Contras | Fuente |
|---|---|---|---|---|---|
| **Meta Cloud API directa** (recomendada) | **$0** | Solo tarifas Meta | Ya integrada en el código; sin intermediario; webhooks con `pricing` | Hay que construir bandeja/panel (ya está en el plan) | https://developers.facebook.com/docs/whatsapp/pricing |
| **Coexistencia** (app WhatsApp Business + Cloud API en el mismo número) | $0 en Meta | Lo que escribe el dueño en la app no se cobra; lo que envía el software se cobra como Cloud API | El dueño sigue usando su app; útil para modo Manual | Debe validarse disponibilidad para números +506 y comportamiento de historial | https://360dialog.com/blog/whatsapp-coexistence/ (BSP; validar en documentación de Meta) |
| **Twilio** | $0/mes | **$0,005 por mensaje, entrante o saliente** + tarifas Meta | Un solo proveedor si luego se agregan SMS/voz (`voice.ts` ya acepta formato Twilio) | Cobra también los **entrantes** | https://www.twilio.com/en-us/whatsapp/pricing |
| **360dialog** | **€49 / $59 por número/mes** (Regular); €99 / $119 Premium | Tarifas Meta sin margen | Soporte 24/7, verificación en 48 h (Premium) | Costo fijo mensual sin necesidad real hoy | https://docs.360dialog.com/docs/get-started/pricing |
| Plataformas con bandeja (WATI, etc.) | Desde ~€59/mes | Margen sobre tarifas Meta (WhatChimp reporta ~60% en marketing para Wati) | Bandeja lista | Duplica lo que JARVIS ya hace; costo | https://whatchimp.com/whatsapp-api-provider/ (comparador, por validar) |
| APIs no oficiales (Evolution API, Wasender) | $0–$6/mes | — | Baratas | **Violan términos de WhatsApp → riesgo de bloqueo del número.** Descartadas. | https://dev.to/danishjaved/choosing-a-whatsapp-api-in-2026-10-options-real-prices-and-when-to-use-each-5a4f |

### 7.3 Qué es $0 y qué no

| Concepto | ¿$0? |
|---|---|
| Recibir mensajes de clientes | **Sí** (Meta no cobra entrantes; Twilio sí: $0,005) |
| Webhook en Cloud Run / Firestore actuales | Sí dentro del uso actual (validar facturación GCP) |
| Primeros 1.000 mensajes de servicio por mes por número | **Sí** |
| Mensajes de servicio desde el 1.001 | **No** ($0,0034 EE. UU.; $0,0113 CR) |
| Plantillas utility (recordatorios, confirmaciones), incluso dentro de 24 h | **No** |
| Plantillas marketing | **No** (la más cara) |
| Alertas al dueño por WhatsApp desde el número de negocio | **No** si es plantilla o se pasa de 1.000; alternativa $0: notificación push del panel o email |
| Mensajes que el dueño escribe desde la app (coexistencia) | Sí (según 360dialog; validar) |
| Meta Business Agent (IA de Meta) | **No**: $2 por millón de tokens (~4–5 ¢ por mensaje según Meta). No se usa; usamos Groq. |
| LLM Groq `openai/gpt-oss-120b` | **No**: $0,15/M tokens de entrada, $0,60/M de salida; capa gratis limitada (1.000 solicitudes/día, 200.000 tokens/día) no apta para producción. Fuente: https://console.groq.com/docs/model/openai/gpt-oss-120b y https://llmcostlab.com/news/gpt-oss-120b-groq-pricing/ |

### 7.4 Estimación ilustrativa (supuestos, no datos reales)

Supuesto: 300 conversaciones/mes × 8 respuestas = 2.400 mensajes de servicio; 3.000 tokens de entrada y 500 de salida por respuesta.

| Concepto | Si todos fueran EE. UU. | Si todos fueran CR |
|---|---|---|
| Meta servicio: (2.400 − 1.000) × tarifa | $4,76 | $15,82 |
| Groq: 2.400 × (3.000×$0,15/M + 500×$0,60/M) | $1,80 | $1,80 |
| **Total aprox./mes** | **≈ $6,56** | **≈ $17,62** |
| (Con Twilio, sumar $0,005 × 4.800 mensajes in+out = $24) | | |

Cualquier gasto requiere autorización del dueño; hay que **agregar método de pago en Meta Billing Hub**, porque sin él Meta deja de entregar mensajes de servicio una vez agotados los 1.000 gratis (misma fuente de Meta).

---

## 8. MVP en PRs pequeños

| PR | Alcance |
|---|---|
| WA-1 | Webhook responde 200 inmediato y encola; persistencia `wa_conversations/messages`; tests de dedupe. |
| WA-2 | `whatsapp_settings` + modo por conversación + kill switch + auditoría de cambios. |
| WA-3 | `outboundPolicyGuard` determinista (6 límites + disparadores de escalado) con tests de contrato. |
| WA-4 | Semiautomático: borrador → `requestOwnerApproval` → enviar/editar/descartar; consumo único. |
| WA-5 | `wa_outbox` + sender idempotente + webhooks de estado con `pricing` (costo real). |
| WA-6 | Panel del dueño: bandeja, feed en vivo, "Tomar", alertas push (PWA, $0). |
| WA-7 | Automático por franja horaria y por intención (solo FAQ/logística al inicio). |
| WA-8 | Plantillas utility (confirmación de solicitud, recordatorio día antes) — requiere aprobación de Meta y gasto autorizado. |

Arranque recomendado: **Semiautomático global**, Automático solo para FAQ después de 2 semanas con <2% de bloqueos y revisión diaria sin incidentes (umbral por decidir).

---

## 9. Decisiones que necesita el dueño

1. Confirmar canal: Meta Cloud API directa (recomendado) vs Twilio/360dialog.
2. ¿Usar coexistencia con su número actual o un número nuevo dedicado al negocio?
3. Umbral de monto para escalar y horario del modo Automático.
4. Autorizar método de pago en Meta (gasto estimado < $20/mes al volumen supuesto).
5. Plazos de retención y revisión legal de transferencia internacional (Meta/Groq).
