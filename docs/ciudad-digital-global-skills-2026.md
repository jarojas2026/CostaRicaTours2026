# Costa Rica Tours — preparación de la ciudad digital internacional
**Fecha de revisión:** 2026-10-11
**Estado:** primera entrega implementada en una rama sujeta a PR y CI; NO hay registro público mundial ni pagos internacionales habilitados.

## 1. Visión
Costa Rica sigue siendo el mercado, la marca y la fuente de la oferta verificada original. El diseño mundial es una expansión opt-in, país por país, conservando catálogos, identidades, proveedores, reservas y agentes como servicios de dominio comunes. No equivale a publicidad de empresas o instituciones de otros países sin fuentes válidas.

## 2. Qué existe y qué se añade
Reutilizado: `backend/operationalProviderRegistryService.ts`, `backend/bookingService.ts`, `backend/bookingStateMachine.ts`, `backend/commerceCatalog.ts`, `backend/agentTools.ts`, `backend/travelJourneyOrchestrator.ts`, `backend/adminControlCenterService.ts`, `AdminRouteGuard`, `KnowledgeCityPanel` y `AgentOfficeMap`.

Se añade en este PR:
- `backend/digitalCityRegistrationPolicy.ts`: preflight puro, fail-closed y sin escrituras, para los tipos: persona, freelance, microempresa, empresa, comunidad, asociación, institución, espacio público, espacio privado y organizador de eventos.
- `POST /api/admin/digital-city/registration/preflight`, protegido por `requireAdmin`, evalúa requisitos; no almacena información y no devuelve permisos operativos.
- `src/components/DigitalCityRegistrationPreflight.tsx`: formulario bilingüe **solo administrativo** de evaluación previa.
- `tests/digitalCityRegistrationPolicy.test.ts`: pruebas de consentimiento, autoridad, territorio y prohibición de ventas automáticas.
- `.agents/skills/global-city-onboarding/SKILL.md`: skill con frontmatter válido para futuras IAs de desarrollo. Es documentación ejecutable *por una IA que decida cargarla*, no una integración automática con todos los modelos existentes.

### Semántica
`ready_for_moderation` solo indica que hay información mínima para **solicitar revisión**. Aun en ese estado:
`publishable=false`, `bookable=false`, `paymentEnabled=false`, `persisted=false`, `requiresHumanReview=true`.

`countryCode` valida formato ISO 3166-1 alpha-2, no prueba que el país exista o que una entidad cumpla su ley. Requiere una tabla/servicio de territorios verificado antes de registrar ubicaciones definitivas.

## 3. Camino hacia una inscripción funcional
1. Reutilizar Firebase Authentication para identificar al solicitante.
2. Construir expediente y membresías de organización con permisos por recurso; no otorgar autoridad por un simple checkbox.
3. Guardar borradores privados con consentimiento y control de retención, en una colección seleccionada después de inventario y revisión de reglas de Firestore.
4. Implementar revisión humana y evidencia documental; proteger identidad, propiedad y representación. Una ficha pública no es una entidad asociada oficialmente.
5. Añadir catálogo editorial y búsqueda territorial internacional con procedencia, vigencia, deduplicación y moderación.
6. Conectar únicamente entidades autorizadas a `commerceCatalog`, `bookingService`, verificaciones de proveedor, pasarela de pagos y políticas locales.
7. Lanzar pruebas de cumplimiento, impuestos, devoluciones, divisas, protección de datos y pagos **por jurisdicción** antes de promover al estado reservable.

## 4. AI Skills e interoperabilidad
La especificación pública de [Agent Skills](https://agentskills.io/specification) define carpetas con `SKILL.md`, frontmatter `name`/`description`, y carga progresiva de detalles. El archivo creado usa ese formato. No se reemplazan las tres skills heredadas de `.agents/skills` ni se modifican workflows antiguos.

Investigación externa (11-10-2026):
- [OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents/sdk): handoffs, tools, evaluaciones y guardrails; pilotar con adaptadores a los servicios existentes y evitar trazas con PII.
- [Google ADK SkillToolset](https://developers.googleblog.com/developers-guide-to-building-adk-agents-with-skills/): habilidades cargadas bajo demanda y especialización; evaluar, no duplicar el orquestador.
- [MCP 2026-07-28](https://blog.modelcontextprotocol.io/posts/2026-07-28/): núcleo stateless, autorización reforzada; integrar solo conectores de servicios con scope, consentimiento y token audience adecuados.
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/): instrumentar trazas mínimas por ejecución de agente y reservas sin PII ni secretos.
- Kimi, DeepSeek, Qwen y otros modelos: proveedores a comparar por coste *actual verificado*, capacidad, privacidad, transferencia de datos, contrato y evaluación por tarea. No enviar información privada a un endpoint desconocido ni asumir nivel gratuito.

Las **AI Skills del repositorio son manuales reutilizables** para agentes de desarrollo hasta integrarse explícitamente en el runtime con autorizaciones y pruebas. No se consideran herramientas que crean reservas ni habilitan nuevos países por sí solas.

## 5. Fallos auditados y control de despliegue
- Al 11-10-2026 `main` (SHA `bf92509`) pasa Build & Type Check, Python y workflow de Cloud Run; la verificación HTTP independiente de backend/cobros no ha sido demostrada.
- PRs #151, #152, #154, #155, #156 y #157 conservan checks antiguos verdes, pero GitHub los marca `mergeable=false` frente al `main` actual: **no fusionar ni forzar lockfiles**. Resolver por lote aislado con instalación limpia y CI.
- **P0**: `backend/nativeAutomationEngine.ts/executeInicioReserva` reporta bloqueo de cupo exitoso sin inspeccionar el resultado de `createBooking` y usando un ID local distinto del persistido; issue #175. No afirmar que se ha corregido.
- Existen credenciales de cuenta de servicio compartidas como archivo externo; revocar/rotar por el administrador de GCP. Nunca usar ni copiar al repositorio. Priorizar GitHub OIDC / Workload Identity Federation.

## 6. Gate de liberación
Cada entrega debe preservar compatibilidad, ejecutar lint, contratos, build, CI y pruebas de permisos. Merge solo si SHA revisado y checks verdes; un despliegue exitoso no equivale a reserva o pago verificado. Mantener indicadores de `propuesto`, `implementado`, `probado`, `operativo` separados.
