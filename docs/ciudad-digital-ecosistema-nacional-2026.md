# Costa Rica Tours — Ciudad digital de Costa Rica
## Plan operativo, registro universal y oficina visual de agentes
**Revisión:** 2026-10-11 · **Naturaleza:** visión escalonada; las capacidades futuras NO se anuncian como terminadas.

### 1. Visión, alcance y límites
Costa Rica Tours debe evolucionar sobre el monolito modular existente de React/Express/Firestore, no convertirse en una segunda aplicación, segunda base de reservas o colección de agentes desconectados.
El destino es un directorio/comercio/centro de asistencia donde una persona descubra, contacte y —solo cuando sea legal y técnicamente posible— reserve o compre bienes y servicios de cualquier escala y región costarricense. La plataforma no representa oficialmente al Gobierno ni a las autoridades por el mero hecho de listar espacios públicos.
Una **ficha publicada** no significa que exista contrato comercial, autorización, licencia o disponibilidad. Un **servicio comercializable** debe pasar verificaciones adicionales.
Cobertura aspiracional: turismo, alojamiento, transporte, alimentación, cultura, artesanías, guías independientes, fincas y experiencias rurales, asociaciones de desarrollo, ferias, comunidades, espacios públicos, parques (respetando reglas de SINAC u otras autoridades), entidades, microempresas, profesionales freelance, iniciativas ambientales y eventos. No se publicará un perfil individual sin consentimiento y base legal apropiada.

### 2. Sujetos, roles y registro
Separar identidades de personas de entidades organizativas y de lugares. Una persona puede pertenecer a múltiples organizaciones sin compartir permisos indebidamente.

| Tipo de inscripción | Identidad, publicación y autorización |
| --- | --- |
| Persona viajera | cuenta y preferencias privadas; nunca publicación automática |
| Trabajador independiente / freelance | perfil opt-in; contacto público elegido por la persona; verificación aplicable a su oficio |
| Microempresa / emprendimiento rural | perfil de negocio; prueba de representación y capacidad de prestar el servicio |
| Empresa / operador / hotel | organización, responsables, contrato, verificación y catálogo |
| Asociación / comunidad / cooperativa | representación y permisos delegados; consentimiento para información comunitaria |
| Evento / organizador | promotor responsable, programa, fuente, lugar, estado y vigencia |
| Institución / espacio público / parque | ficha editorial identificada como información pública; **sin suplantar** a la autoridad; transacción o venta solo bajo autorización o integración formal |
| Espacio privado / finca / actividad | autorización del propietario/operador, restricciones de acceso, seguridad y derechos |
| Entidad sin personalidad jurídica | participación informativa y contacto, sin atribuir capacidad legal ni permitir contratos/pagos en su nombre hasta verificar responsable |

Flujo de alta escalonado: identidad autenticada → consentimiento y aviso de privacidad → tipo de sujeto → asociación/representación → ubicación geográfica → contenido básico y licencia de medios → revisión/moderación → publicación informativa → verificación comercial documental → activación de servicios → integración de inventario y pagos cuando sea aplicable.
Estados propuestos (NO existentes por defecto): `draft`, `submitted`, `identity_review`, `content_review`, `published_informational`, `commercial_verification`, `bookable`, `restricted`, `suspended`. Diseñar migración a partir de estados existentes en `operators`, `proveedores` y portal; jamás migrar automáticamente `published_informational` a `bookable`.
Admisión de menores, direcciones privadas, teléfonos y datos de identidad requieren controles reforzados. Se ofrecerá eliminación/corrección con revisión de requerimientos legales y retención de auditorías.

### 3. Modelo de ciudad compartido (logical, no crear colecciones indiscriminadamente)
`Identity` ↔ `Membership` ↔ `Organization`; `Organization` → `Service` → `Availability` → `Booking` → `Payment` → `Payout`.
`Place` ↔ `Service` y `Event`; `Community` ↔ `Organization` y `Place`; `Verification` y `Policy` gobiernan publicación y transacciones.
El esquema debe expresar: tipo de entidad, dueño/responsable, rol autorizado, estatus de verificación, `source`, `verifiedAt`, `expiresAt`, visibilidad, idioma ES/EN, geografía (provincia/cantón/distrito), accesibilidad verificada cuando se alegue, vigencia, licencias y permisos para medios.
Categorías del catálogo sin asumir todas comercializables: experiencia, alojamiento, transporte, gastronomía, cultura, comunidad, guía, comercio local, bienestar, eventos, espacio público y otros. Extensiones tipadas por vertical, pero un mismo buscador y una misma política de confianza.

### 4. Reutilización obligatoria del repositorio
- Catálogo `src/data/toursData.ts`, `backend/commerceCatalog.ts`, `backend/tourMediaService.ts`. Conservar rutas e imágenes existentes, verificar procedencia y no copiar contenido de terceros.
- Reservas/cupos `backend/bookingService.ts`, `backend/liveInventoryGateway.ts`, `backend/bookingStateMachine.ts` y `backend/idempotencyService.ts`.
- Pagos y liquidación `backend/paymentWebhookService.ts`, `backend/paymentWebhookHttpService.ts`, `backend/providerPayoutService.ts`.
- Proveedores `backend/providerPortalService.ts`, `backend/operationalProviderRegistryService.ts`, `backend/providerInboxAgent.ts`.
- Viaje `backend/travelJourneyOrchestrator.ts`, `backend/itineraryService.ts`, memorias del viajero y motor de clima.
- Agentes `backend/agentKnowledgeFabric.ts`, `backend/agentMeshService.ts`, `backend/nativeAutomationEngine.ts`, `backend/agentTools.ts`.
- Administración `backend/adminControlCenterService.ts`, `src/pages/AdminControlCenterPage.tsx` protegida por `AdminRouteGuard`, Knowledge City `src/components/KnowledgeCityPanel.tsx`.
- Geografía y eventos: **inventariar primero** servicios existentes y fuentes oficiales antes de abrir escritura pública.
El documento `docs/arquitectura-ciudad-digital.md` sigue siendo referencia inicial; este plan añade criterios concretos, no reemplaza sus reglas.

### 5. Centro virtual de oficinas — entrega incremental
**Fase A (implementada en esta rama, sujeta a CI):** `AgentOfficeMap` dentro del dashboard administrativo existente, con visualización 2D agrupada por funciones y selección de agente. `agentOfficeProjection` consume exclusivamente los eventos `agent_events` ya disponibles; última actividad y evento visible, sin exponer `payload`, secretos ni mensajes de viajeros. La consulta del servidor usa un máximo de 120 eventos y autenticación administrativa de la ruta existente.
Estados mostrados: actividad observada en los últimos 5 minutos, sin señal reciente, telemetría no disponible. Un evento finalizado NO significa que el agente siga trabajando. El registro de una identidad NO significa que el proceso esté en línea. **No existe todavía un dato fiable de reposo ni tarea activa**, por lo que se muestra expresamente como no verificable.
**Fase B (pendiente):** instrumentación backend en llamadas reales a agentes: `executionId`, `agentId`, `correlationId`, `taskCategory`, `status` (`queued/running/waiting_approval/completed/failed`), `startedAt`, `lastHeartbeatAt`, `endedAt`, `owner`, TTL, sin PII; auditoría de transiciones. Identificar como `stale` cualquier ejecución sin heartbeat, nunca asumir éxito.
**Fase C (pendiente):** panel para inspeccionar trazas y tareas, aprobar/rechazar únicamente acciones autorizadas (pagos, cancelaciones, cambios de proveedor), pausar agentes mediante mecanismo backend autenticado y auditado, reasignar y reintentar idempotentemente. Sin botón simulado ni control que solamente cambie la apariencia.
**Fase D opcional:** editor de grafos/flujo con React Flow (verificar licencia, coste y rendimiento) o escena espacial 3D solo si aporta comprensión operativa. El espacio virtual NO es fuente de verdad.
No permitir que el dashboard ejecute código arbitrario ni operaciones destructivas a través del prompt de un agente.

### 6. Tecnologías evaluadas al 11-10-2026 (no instaladas por esta fase)
| Opción documentada oficialmente | Aplicación | Criterio de adopción |
| --- | --- | --- |
| OpenAI Agents SDK | orquestación por herramientas, handoffs, guardrails, trazas | piloto aislado con contratos; nunca segundo bookingService |
| Google Agent Development Kit (ADK) | agentes especialistas y workflows con Gemini/otros | adaptación mediante puertos/herramientas ya existentes |
| LangGraph | persistencia/checkpoints/human-in-loop | evaluar si supera al motor nativo para una tarea concreta |
| Temporal | workflows durables, recuperación tras caídas | no incorporar sin necesidad medida de durabilidad/escalamiento |
| OpenTelemetry JS | trazas/métricas estandarizadas | prioridad para correlación sin PII, sampling y retención |
| React Flow (`@xyflow/react`) | grafos, editor de flujos e inspección visual | futuro; plano inicial CSS/React sin dependencia adicional |
| Kimi / DeepSeek / Qwen | modelos alternativos accesibles por API | capacidad, privacidad, residencia de datos, costo y calidad; no desplegar hasta evaluación independiente |
| Google Cloud Workload Identity Federation | CI sin claves persistentes | alta prioridad: sustituir claves exportadas y revocar las antiguas |
Fuentes técnicas: https://developers.openai.com/api/docs/guides/agents/sdk ; https://github.com/google/adk-docs ; https://langchain-ai.github.io/langgraph/concepts/durable_execution/ ; https://docs.temporal.io/ ; https://opentelemetry.io/docs/languages/js/ ; https://reactflow.dev/ ; https://docs.cloud.google.com/iam/docs/workload-identity-federation ; https://www.kimi.ai/help/kimi-api/api-overview ; https://api-docs.deepseek.com/ ; https://www.alibabacloud.com/help/en/model-studio/models
No asumir acceso gratuito, límites, precios, compatibilidad total ni legalidad de transferencia internacional de datos sin verificación por proveedor.

### 7. Resiliencia y negocio a gran escala
Una meta de crecimiento nacional y alto tráfico exige medir, no garantizar capacidad imaginaria.
- Acceso por roles + permisos por recurso/organización, rate-limits, cuotas de API/modelos por cliente y proveedor.
- Separar servicios de lectura pública cacheables de las escrituras comerciales transaccionales; paginar geobúsquedas; índices y CDN para fotografías verificadas.
- Idempotencia en reserva, pagos, webhooks, notificaciones y liquidaciones; reconciliación programada, outbox cuando sea necesario; colas con DLQ y backoff.
- Pruebas de carga con percentiles p95/p99, RPS medido, cold starts de Cloud Run, saturación Firestore, fallos parciales y recuperación bajo concurrencia.
- Auditoría de antifraude, consentimiento, moderación, dispute handling, contenidos maliciosos y abuso de IA.
- Finanzas como registros verificables y eventos reconciliados, no proyecciones sintéticas ni marketing de ingresos garantizados.

### 8. Plan de ejecución con entregables, pruebas y gates
| Secuencia | Resultado | Criterio de aceptación |
| --- | --- | --- |
| 0 | Seguridad de credenciales | revocar/reemplazar claves privadas expuestas; WIF; confirmar scopes mínimos; no guardar en repo |
| 1 | Flujo actual de reservas y pagos | pruebas E2E sandbox: disponibilidad → hold → proveedor → pago verificado → operación → cancelación/reembolso; no sobreventa |
| 2 | Telemetría y oficina de agentes | primer plano sin simulaciones (Fase A); luego tareas con heartbeat y auditoría (Fase B) |
| 3 | Registro universal gradual | personas/organizaciones/membresías/representación con RBAC, consentimiento y moderación |
| 4 | Directorio territorial | geocódigos, provincias/cantones/distritos, fuentes, deduplicación, ES/EN, control editorial |
| 5 | Marketplace de nuevas categorías | adaptadores por tipo, políticas, proveedor verificable, catálogo único |
| 6 | Eventos y comunidades | organizador, fechas, fuente, licencias, entradas solo con acuerdos |
| 7 | Interoperabilidad | API/SDK de proveedor con auth, webhooks firmados y trazas |
| 8 | Escalamiento real | SLO, pruebas de carga, coste por transacción, límites y recuperación |
Cada fase: issue/PR con diff mínimo, tests unitarios/contratos/E2E, validaciones CI, auditoría de roles, despliegue controlado y rollback. No borrar datos ni editar silenciosamente colecciones existentes.

### 9. Riesgos que NO deben quedar ocultos
- Algunos módulos de automatización contienen descripciones de objetivos ambiciosos que no equivalen a garantías operativas. Nunca inferir estado real del agente por su nombre, prompt, contador constante o presencia en catálogo.
- No afirmar que un portal público representa a una institución sin autorización.
- No afirmar millones de transacciones o ingresos sin evidencia; diseñar para crecer por etapas y presupuesto.
- Faltan verificaciones end-to-end de pagos, proveedores y operaciones que requieren sandbox real.
- **Seguridad crítica:** se aportó al proyecto una clave privada de cuenta de servicio Google Cloud como archivo. Considerarla comprometida hasta revocación; no copiarla, emplearla ni exponerla. Rotar clave, revisar auditoría IAM y migrar a Workload Identity Federation/GitHub OIDC. La revocación requiere acceso administrativo a Google Cloud.
