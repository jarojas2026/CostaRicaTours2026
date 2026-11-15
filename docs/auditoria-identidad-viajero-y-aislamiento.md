# Auditoría técnica: identidad del viajero y propiedad de itinerarios

**Fecha:** 14 de noviembre de 2026  
**Base revisada:** `main` en el commit `1777ee51a663951faa11ac1f764a565238a68ad1` y documentación del PR #518.  
**Estado:** hallazgos estáticos; no se ejecutaron pruebas, no se conectó a Firestore y no se hicieron cambios de runtime.

## Objetivo

Preparar la cuenta viajera persistente definida por el propietario: una persona autenticada debe recuperar su perfil, itinerarios, favoritos e historial entre dispositivos y países, sin que otro usuario, hotel u operador pueda consultar o modificar esos datos. Los visitantes anónimos no deben adquirir memoria personal persistente entre visitas. Los datos empresariales deben aislarse por tenant.

## Hallazgos comprobados

### 1. Los itinerarios se persisten, pero no tienen propietario canónico

En `backend/travelJourneyOrchestrator.ts`:
- `persistJourney()` guarda el objeto en `traveler_journeys/{journeyId}`.
- `buildTripJourney()` incorpora un `sessionId` opcional, pero no asigna un `ownerUid` autenticado ni un `tenantId`.
- `loadJourney()` recupera el documento usando solamente `journeyId`.
- `getTravelerJourney()` y `adaptTravelerJourney()` no reciben ni verifican un propietario.

La persistencia en Firestore no equivale todavía a propiedad segura de la cuenta. El identificador del documento no debe funcionar como autorización.

### 2. Las rutas HTTP de journeys no exigen identidad del viajero

En `backend/routes/journey.ts` se observaron:
- `POST /api/journey/build`
- `GET /api/journey/:journeyId`
- `POST /api/journey/:journeyId/adapt`
- `POST /api/ai/journey`
- `GET /api/ai/journey/:journeyId`
- `PATCH /api/ai/journey/:journeyId`
- `POST /api/ai/journey/:journeyId/guardian`
- `POST /api/ai/journey/:journeyId/observe`

Las rutas inspeccionadas llaman al orquestador sin una comprobación visible de que quien consulta o adapta sea dueño del viaje. Algunas rutas de IA incluyen `aiAdmission`, pero eso no demuestra propiedad del viajero ni aislamiento de cuenta.

**Riesgo:** alguien que obtenga o adivine un identificador podría intentar recuperar o alterar un itinerario ajeno. La revisión estática identifica una debilidad de autorización; no demuestra que haya ocurrido una exposición real.

### 3. El almacenamiento del navegador está separado por identidad, pero eso no protege el backend

`src/components/FullTripJourneyBuilder.tsx` guarda el identificador del viaje en almacenamiento personal y descarta respuestas obsoletas cuando cambia la identidad local. `tests/privateStorageScope.contract.test.ts` cubre escenarios de cambio de cuenta y cierre de sesión.

Esos controles evitan mezclas en el navegador, pero no reemplazan la autorización del servidor: el backend debe verificar al propietario en cada lectura y modificación.

### 4. La memoria conversacional usa sesiones firmadas, no una identidad global de viajero

En `backend/routes/chat.ts` se emite una sesión con `issueChatSession()` y se exige el token HMAC correspondiente para consultar, guardar o borrar historial. `backend/memoryService.ts` persiste bajo `agent_memory/{sessionId}`.

En `firestore.rules`, la regla de `agent_memory` permite acceso de cliente solo cuando `request.auth.uid == sessionId`; el flujo de memoria conversacional revisado opera mediante el backend y su sesión firmada. Este diseño no demuestra una vinculación durable entre sesión, UID autenticado y perfil del viajero. Además, `signedAccessTokens.ts` documenta un secreto efímero por instancia cuando no existe secreto compartido configurado; eso debe resolverse antes de depender de tokens entre instancias o reinicios.

### 5. El perfil Firestore actual es mínimo

La regla `users/{userId}` de `firestore.rules` valida `userId`, `createdAt` y, opcionalmente, `email` y `displayName`. No representa por sí sola perfil completo, preferencias, favoritos, itinerarios ni retención. No ampliar esa regla sin definir qué campos puede editar el cliente y cuáles son exclusivos del servidor.

## Decisión técnica recomendada

No introducir un cambio parcial que proteja solo una ruta. La autorización debe cubrir todos los puntos de entrada y operaciones sobre el mismo recurso.

### Fase A — modelo de identidad y propiedad

1. Usar el UID verificado por Firebase Authentication en el servidor como identidad canónica del cliente autenticado. Nunca aceptar `uid`, `ownerUid` o `tenantId` del cuerpo como prueba de identidad.
2. Definir estados: visitante anónimo, cliente autenticado, colaborador de hotel/operador, administrador y propietario.
3. Añadir a cada itinerario, cuando corresponda, `ownerUid`, `tenantId`, `createdBy`, `visibility`, `createdAt`, `updatedAt` y versión de esquema. Para visitante anónimo, usar capacidad de sesión firmada, limitada y revocable; no inventar un UID.
4. Separar propietario personal y empresa prestadora. Una reserva puede relacionarse con viajero y proveedor/tenant, pero no heredar acceso empresarial por conocer un ID.

### Fase B — autorización de extremo a extremo

1. Implementar una única política backend para crear, leer, adaptar, observar, replanificar, exportar y eliminar itinerarios.
2. Aplicarla a todas las rutas `/api/journey`, `/api/ai/journey`, herramientas de agentes y cualquier integración que invoque el orquestador directamente.
3. Verificar propietario y tenant en el servidor en cada consulta Firestore. El ID del documento nunca será suficiente.
4. Devolver una respuesta indistinguible para recurso inexistente o ajeno cuando sea necesario para evitar enumeración.
5. Limitar a proveedores a la proyección de datos operativos de sus propias reservas; no exponer perfil, conversaciones ni preferencias privadas.

### Fase C — sesiones, continuidad y migración

1. Vincular sesiones de chat y journeys autenticados al UID verificado; rotar o renovar capacidades al iniciar/cerrar sesión.
2. Para visitantes anónimos, permitir recuperación solo mediante capacidad firmada de sesión. Al iniciar sesión, ofrecer vinculación explícita y confirmada; nunca fusionar por coincidencia de nombre, correo no verificado o ID.
3. Migrar journeys antiguos sin propietario con política explícita: no asignarlos automáticamente a la primera cuenta que presente el ID. Exigir prueba de posesión de sesión original o mantenerlos aislados hasta recuperación segura.
4. Definir retención por categoría y flujos de exportación, rectificación y eliminación; no conservar conversaciones ni datos sensibles indefinidamente por defecto.

## Pruebas obligatorias antes de integrar

- Un viajero autenticado crea y recupera su itinerario desde dos dispositivos con el mismo UID.
- Un segundo UID no puede leer, adaptar, observar, replanificar, exportar ni eliminar el itinerario del primero, incluso si conoce el `journeyId`.
- Un tenant hotelero no puede consultar datos de otro tenant ni el perfil privado del viajero.
- Cambio de cuenta, cierre de sesión, expiración o revocación invalida las capacidades correspondientes.
- Un visitante anónimo solo recupera su itinerario con capacidad válida; un ID aislado no autoriza acceso.
- Rutas de IA y herramientas internas respetan exactamente la misma política.
- Las reservas siguen usando el servicio canónico existente; no se duplica el ledger.
- Tests de contrato de rutas, autenticación, Firestore Rules y flujos existentes siguen pasando.

## Archivos que requieren revisión conjunta al implementar

`backend/travelJourneyOrchestrator.ts`, `backend/routes/journey.ts`, `backend/signedAccessTokens.ts`, `backend/memoryService.ts`, `backend/agentTools.ts`, `backend/customerIntakeGateway.ts`, `src/components/FullTripJourneyBuilder.tsx`, `src/utils/privateStorage.ts`, `firestore.rules` y tests de autenticación, journeys, intake, almacenamiento privado y contratos de rutas.

## Límites y siguiente paso

Este documento registra hallazgos y un plan de corrección; **no afirma que la cuenta mundial, el aislamiento de itinerarios o la memoria entre dispositivos ya estén implementados**. No se cambió lógica, reglas de Firestore, datos, API gateway, configuración, facturación ni infraestructura. No se ejecutaron tests ni despliegues.

La implementación debe realizarse como una unidad coherente en rama aislada, con pruebas de autorización para todas las rutas y herramientas. El PR debe permanecer en borrador hasta completar pruebas y revisión de seguridad. No fusionar a `main` ni desplegar sin autorización expresa del propietario.


## Ampliación de auditoría: caminos indirectos y rutas auxiliares

La inspección posterior de los puntos de entrada encontró caminos adicionales que deben formar parte del mismo control de acceso. Esta ampliación evita corregir únicamente las rutas REST de journeys y dejar rutas laterales.

### 6. Customer Intake puede adaptar un journey por referencia

En `backend/routes/intake.ts`, `POST /api/customer-intake` es público y acepta un contexto enviado por el cliente. En `backend/customerIntakeGateway.ts`, `buildStructuredJourneyAssistant()` lee `payload.context.existingJourneyId` y llama directamente a `adaptTravelerJourney(existingJourneyId, journeyInput)`.

El identificador de sesión web se filtra por formato, pero eso no acredita por sí mismo la posesión de un journey ni vincula la sesión a una cuenta autenticada. La corrección debe exigir la misma autorización de propietario/capacidad que las rutas de journeys, o ignorar la referencia y crear un viaje nuevo cuando no exista prueba válida. No se debe aceptar un `existingJourneyId` como autorización.

### 7. Las herramientas de agentes también llaman al orquestador directamente

En `backend/agentTools.ts`, las herramientas `build_trip_journey`, `adapt_trip_journey` y `trip_health_snapshot` invocan directamente funciones del orquestador. Las rutas de herramientas internas deben validar una credencial de agente y una autorización de recurso/actor; la política no puede depender únicamente de que el acceso ocurra desde una ruta de journeys.

En `backend/routes/agents.ts`, la ruta `POST /api/agent/tools/generate_custom_itinerary` aparece registrada sin el middleware `requireAgentTool`, a diferencia de otras herramientas vecinas. Esta ruta no demuestra por sí misma acceso a un journey guardado, pero es un hallazgo separado de control de acceso y posible abuso de recursos de IA que debe revisarse antes de producción. No se declara explotabilidad ni gasto ocurrido.

### 8. La compatibilidad de visitantes debe diseñarse antes de exigir login

`src/components/FullTripJourneyBuilder.tsx` actualmente construye viajes como visitante, enviando un `sessionId` generado en el cliente y guardando el `journeyId` en almacenamiento local/de sesión. No envía una prueba de identidad Firebase ni una capacidad de acceso específica del journey.

Por tanto, exigir Firebase Auth en todas las operaciones rompería el planificador público actual. La alternativa segura es:
- Cuenta autenticada: el backend deriva `ownerUid` únicamente del ID token Firebase verificado.
- Visitante: el backend emite una capacidad aleatoria, de alta entropía, vinculada a un solo journey; almacena únicamente su hash y la devuelve una sola vez al navegador.
- Lectura/adaptación del visitante: requiere esa capacidad, nunca el `journeyId` por sí solo.
- Conversión de visitante a cuenta: requiere acción explícita y verificación; la vinculación debe ocurrir en una operación controlada, no por coincidencia de IDs.
- Viajes históricos sin propietario ni capacidad verificable: quedan en cuarentena de acceso hasta un procedimiento de recuperación aprobado.

### 9. Alcance de implementación corregido

La unidad mínima de implementación debe abarcar conjuntamente:
- `backend/travelJourneyOrchestrator.ts` y un módulo único de política/capacidad de journey.
- Todas las rutas de `backend/routes/journey.ts`.
- `backend/customerIntakeGateway.ts` y el contrato de `POST /api/customer-intake`.
- Herramientas y rutas de `backend/agentTools.ts` y `backend/routes/agents.ts`.
- `src/components/FullTripJourneyBuilder.tsx` y `src/utils/privateStorage.ts`.
- Contratos y pruebas de rutas, autenticación, visitantes, conversión de cuenta, tenant y compatibilidad.

No se debe fusionar una protección parcial de las rutas REST mientras Customer Intake o herramientas internas puedan modificar el mismo recurso por otra vía. La ruta auxiliar de generación de itinerarios debe tratarse además como una revisión separada de acceso/costo.

**Resultado de esta ampliación:** el alcance inicial de corrección era demasiado estrecho. Se actualiza el plan para cubrir todos los caminos directos e indirectos antes de afirmar que existe aislamiento real. Sigue siendo una auditoría estática; no se ejecutaron pruebas ni se cambió runtime.
