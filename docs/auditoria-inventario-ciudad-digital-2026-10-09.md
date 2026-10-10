# Fase 0 — Inventario inicial de la ciudad digital
## Costa Rica Tours 2026

**Fecha de elaboración:** 2026-10-09 (Costa Rica)  
**Fuente de código revisada:** rama `main` del repositorio `jarojas2026/CostaRicaTours2026`.  
**Estado:** inventario estático inicial; no equivale a una prueba de producción ni a una auditoría completa de todos los archivos.

## 1. Hallazgo principal

El repositorio ya contiene una cantidad significativa de componentes que corresponden al modelo de ciudad digital. La estrategia correcta es consolidar y validar los componentes existentes antes de crear módulos paralelos.

La estructura observada incluye:
- Frontend React/TypeScript y servidor Express.
- Firebase Admin/Firestore y reglas con denegación por defecto.
- Servicios de reserva, máquina de estados, idempotencia y política comercial.
- Puerta de inventario externo y política de evidencia/veracidad.
- Servicios de proveedores, portal, aceptación, comunicaciones y liquidaciones.
- Webhooks de pagos, pasarela Stripe y servicio SINPE.
- Bus de eventos operativos, automatización nativa y tareas.
- Agentes de IA, herramientas, conocimiento turístico, memoria organizativa y orquestación de viajes.
- Pruebas de contratos para disponibilidad, reservas, pagos, seguridad, proveedores, IA y despliegue.
- Flujos de CI para compilación y despliegue.

## 2. Mapa de capacidades observado en el repositorio

| Dominio de la ciudad | Evidencia en el repositorio | Evaluación inicial |
|---|---|---|
| Interfaz y API | `src/`, `server.ts`, `api/`, `vite.config.ts` | Existe; revisar cada flujo público de punta a punta |
| Identidad y acceso | `backend/authMiddleware.ts`, `backend/travelerIdentityService.ts`, `firestore.rules` | Existe; requiere matriz de autorización por rol/recurso |
| Catálogo y comercio | `backend/commerceCatalog.ts`, `backend/commercePolicy.ts` | Existe; comprobar consistencia de IDs/precios entre UI y backend |
| Reservas | `backend/bookingService.ts`, `backend/bookingStateMachine.ts`, `backend/reservationLifecycleOrchestrator.ts` | Existe; conservar contratos heredados y probar todas las transiciones |
| Disponibilidad | `backend/availabilityRequestService.ts`, `backend/liveInventoryGateway.ts`, `backend/operationalTruthPolicy.ts` | Existe; una puerta de integración no significa que haya proveedores conectados |
| Proveedores | `backend/operationalProviderRegistryService.ts`, `backend/providerAcceptance.ts`, `backend/providerPortalService.ts`, `backend/providerCommunicationService.ts` | Existe; revisar configuración real, cobertura y tiempos de respuesta |
| Pagos | `backend/paymentWebhookService.ts`, `backend/paymentWebhookHttpService.ts`, `backend/sinpeService.ts` | Existe; validar credenciales, webhooks, sandbox y conciliación por ambiente |
| Comisiones/liquidaciones | `backend/providerPayoutPolicy.ts`, `backend/providerPayoutService.ts` | Existe; mantener pago al proveedor cerrado hasta demostrar postcondiciones |
| Eventos/tareas | `backend/operationalEventBus.ts`, `backend/nativeWorkflows.ts`, `backend/nativeAutomationEngine.ts`, `backend/cronEngine.ts` | Existe; confirmar persistencia, entrega, reintentos y scheduler externo |
| IA y viajes | `backend/aiAssistantService.ts`, `backend/agentTools.ts`, `backend/travelJourneyOrchestrator.ts`, `backend/costaRicaTourismKnowledge.ts` | Existe; herramientas deben usar fuentes verificables y permisos por operación |
| Confianza y control | `backend/fraudCheckService.ts`, `backend/verificationTaskService.ts`, `backend/adminControlCenterService.ts` | Parcial por definición; revisar flujos de revisión humana y evidencias |
| Observabilidad | servicios de alertas, escalamiento, trazas y auditoría repartidos por backend | Consolidar métricas de producto y operación; no asumir cobertura completa |
| Pruebas | `tests/` contiene contratos de reservas, pagos, disponibilidad, permisos, proveedores, IA y despliegue | Buena base de contratos; falta mapear cada requisito a una prueba y a un resultado de CI |
| Despliegue | `.github/workflows/`, `Dockerfile`, `netlify.toml`, `vercel.json`, `firebase.json` | Hay múltiples superficies; documentar cuál es canónica por frontend/API/ambiente |

## 3. Evidencia técnica concreta revisada

### 3.1 Seguridad de Firestore
`firestore.rules` comienza con una regla global de denegación y después abre permisos específicos para algunas colecciones. Las escrituras del registro autoritativo de reservas están restringidas a administración; el backend Admin debe aplicar su propia autorización porque el SDK de servidor no está limitado por las reglas de Firestore.

**Acción:** añadir/confirmar pruebas de reglas para cada rol y colección; no reemplazar Default Deny por permisos amplios.

### 3.2 Máquina de estados
`backend/bookingStateMachine.ts` normaliza estados históricos en español/inglés y protege transiciones. El modelo incluye prospect, hold, payment_pending, paid, provider_pending, confirmed, in_operation, completed, cancelled y refunded.

**Acción:** contrastar este modelo con todos los servicios que actualizan reservas, la interfaz, webhooks y tareas. No imponer otro conjunto de estados paralelo.

### 3.3 Verdad operativa
`backend/operationalTruthPolicy.ts` separa evidencia de cliente, proveedor, catálogo autoritativo e inventario verificado. `backend/liveInventoryGateway.ts` valida fuente, fecha de observación y hechos requeridos.

**Acción:** inventariar endpoints y proveedores reales configurados. Si no existe conector o evidencia fresca, la interfaz debe mostrar pendiente/no verificado, nunca “disponible” por inferencia.

### 3.4 Pagos y reservas
`backend/bookingService.ts` incluye control de cupos, idempotencia, política comercial y máquina de estados. Existen servicios separados para webhooks y liquidaciones.

**Acción:** trazar un pago sandbox completo desde solicitud hasta webhook, confirmación del proveedor, comprobante, cancelación/reembolso y conciliación. No deducir que una integración está activa por la sola existencia del código.

### 3.5 Calidad automatizada
`package.json` incluye:
- `npm run audit:security:prod`
- `npm run audit:whatsapp`
- `npm run test:contracts`
- `npm run lint`
- `npm run build`
- `npm run check:release`

El workflow `.github/workflows/build-check.yml` ejecuta auditoría de dependencias de producción, fixture de seguridad, auditoría de routing, pruebas de contratos, chequeo de TypeScript y build.

**Acción:** obtener el resultado real del último run y asociarlo a la revisión concreta. Un workflow definido no prueba que el último commit haya pasado.

## 4. Riesgos/prioridades que deben revalidarse

El informe `docs/auditoria-consolidacion-2026-09-30.md` registró el 30-Sep-2026 una puerta Vercel → Cloud Run que devolvía HTTP 503 por configuración faltante de Workload Identity Federation, y un pendiente `QUEUE-001` de scheduler para Customer Intake. Es evidencia histórica importante, pero **debe repetirse la comprobación antes de declarar que sigue ocurriendo**.

Orden de revisión:
1. Comprobar estado actual de `/api/health`, `/api/tours`, `/api/customer-intake` y `/api/bookings` sin publicar secretos ni abrir Cloud Run anónimamente.
2. Verificar que las variables públicas/no secretas de configuración WIF correspondan al proveedor, audiencia, cuenta de servicio y URL del backend; revisar la presencia de secretos por nombre, nunca imprimir sus valores.
3. Comprobar ejecución de scheduler, reintentos, deduplicación y alerta de Customer Intake.
4. Validar la coincidencia de IDs y precios entre catálogo, detalle, cotizador, backend y checkout.
5. Ejecutar flujos sandbox de disponibilidad, reserva, pago y callback antes de habilitar cobro real.

## 5. Matriz de cobertura pendiente

No marcar una capacidad como “operativa” hasta registrar las siguientes columnas:

| Capacidad | Archivo/endpoint | Fuente de verdad | Prueba automatizada | Prueba de entorno | Bloqueo externo | Estado |
|---|---|---|---|---|---|---|
| Catálogo público | Por completar en inventario de rutas | Firestore/backend | Contrato existente por verificar | API pública | Configuración API | Pendiente de verificación |
| Disponibilidad de proveedor | Por completar por conector | API/portal/respuesta autenticada | `liveInventoryGateway` tests | Proveedor de prueba | Credenciales/acuerdo | Pendiente de verificación |
| Reserva | Servicios de booking/lifecycle | Backend + fuente de inventario | Booking contracts | Reserva sandbox | Configuración ambiente | Pendiente de verificación |
| Pago | Webhook + adaptador de pasarela | Pasarela verificada | Payment contracts | Pago sandbox | Cuenta comercial/secretos | Pendiente de verificación |
| Confirmación de proveedor | Provider acceptance/workflow | Proveedor autenticado | Provider contracts | Respuesta real/sandbox | Canal y operador | Pendiente de verificación |
| Customer Intake | Gateway + cola/scheduler | Persistencia y worker | Pruebas de contrato/auditoría | Mensaje de prueba | Scheduler/credenciales | Pendiente de verificación |
| Liquidación | Payout services | Ledger + pasarela | Payout safety tests | Conciliación sandbox | Contrato financiero | Pendiente de verificación |
| Eventos | Dominio/endpoint por localizar | Organizador/fuente oficial | Por definir | Evento de prueba | Fuentes/partners | Pendiente de verificación |

## 6. Próximas tareas técnicas

1. Generar inventario exhaustivo de rutas Express/API, funciones exportadas, colecciones Firestore y tareas programadas.
2. Ejecutar el workflow de calidad sobre el commit de la rama y documentar fallos reales.
3. Confirmar la salud actual del backend y recuperar la puerta de infraestructura si sigue bloqueada.
4. Completar la matriz de autorizaciones y las pruebas negativas de Firestore/API.
5. Corregir los bloqueos de reserva/pago antes de ampliar la superficie de IA.
6. Añadir eventos y paneles solo después de estabilizar los flujos comerciales existentes.
7. Actualizar este documento con resultados y enlaces a PRs; no dejar tareas como afirmaciones ambiguas.

## 7. Definición de “terminado”

Una tarea solo se considera terminada cuando:
- hay cambio de código/documentación versionado;
- las pruebas relevantes pasan o la excepción queda explícita;
- el flujo se valida en el entorno que corresponde;
- se documentan credenciales o dependencias externas faltantes sin exponer secretos;
- existe un criterio de aceptación reproducible;
- no quedan regresiones conocidas sin asignación o plan de resolución.
