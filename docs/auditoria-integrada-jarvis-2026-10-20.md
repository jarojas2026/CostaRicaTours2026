# Auditoría integrada y contrato de evolución JARVIS PRIME — 2026-10-20

> Estado: **documento técnico de auditoría y plan ejecutable, no implementación de funcionalidades ni certificación de producción**. Conservar `AGENTS.md`, `.agents/AGENTS.md`, `README.md` y contratos existentes. Relacionado con issues #302 y #306.

## 1. Evidencia contrastada

| Fuente | Hecho comprobado | Límite |
| --- | --- | --- |
| GitHub `main` | SHA `2c8f2f9e4209e203e4f8f6845381a20ec076f44d`; PR #293 conduce consultas del mapa al flujo de leads | No certifica backend Cloud Run |
| Vercel producción | Proyecto `costaricatours2026` READY, alias `costaricatours2026.vercel.app`, SHA anterior | READY no prueba checkout ni Gmail |
| GitHub PRs | #300, #301, #303, #304, #305 abiertos en borrador; #284, #294, #299 y #228 abiertos | CI verde no equivale a merge |
| Run 39459191786 | 59 rutas/vistas, 7 perfiles de viewport, 6656 controles observados, 18 interacciones intentadas, 17 observadas, 1 omitida, 7 hallazgos medios, 0 altos/críticos reportados, 0 errores HTTP | No se pulsaron 6656 controles; no se ejecutaron transacciones reales |
| Artefacto QA | `read-only-ui-audit-39459191786`, artifact ID 12282072210 | Revisar los siete hallazgos con screenshots y JSON |
| Código `backend/jarvisOrchestrator.ts` | Reglas de asignación, gobernanza, ledger, approvals y delegación ya existen | No se demostró una ejecución E2E empresarial real |
| Código `backend/aiRouter.ts` | Enrutamiento de proveedores, control de fallos, scrub de PII y fallback | Proveedor configurado no equivale a proveedor activo en Cloud Run |
| `docs/estado-real-del-sistema.md` | Advierte riesgos de hold/reserva y de confirmar estados sin fuente real | Verificar vigencia del diagnóstico contra `main` actual |

### Documentos históricos proporcionados por el propietario
- `plan-maestro-agentes-automatizacion.md`: 5 agentes propuestos (verificación de pago, confirmación, operador, inventario, recuperación) coordinados por n8n.
- `prompt-automatizacion-reservas.md` y documento Word de guías: migración desde reservas en memoria, verificación PayPal, webhook n8n, control de cupos, originalmente centrados en `server.ts`.
- El estado actual tiene servicios de dominio, Firestore y motor nativo; **estos documentos son antecedentes de requisitos, no instrucciones para reinstalar n8n, duplicar reservas ni volver al monolito**.
- Blueprint JARVIS PRIME preparado por otros agentes: visión estratégica, no prueba de ejecución.

## 2. Mapa de capacidades y fuente de verdad

| Dominio | Componente existente a reutilizar | Requisito de prueba |
| --- | --- | --- |
| Concierge y turismo | `travelJourneyOrchestrator`, `tourismIntelligenceEngine`, catálogo | Fechas, regiones, ruta, intereses, fuente de disponibilidad, información vigente |
| Modelos IA | `aiRouter`, `aiConfig` | Modelo realmente invocado, fallbacks, límites de gasto y error |
| Gerencia JARVIS | `jarvisOrchestrator`, `agentGovernanceService`, `ownerApprovalService` | Comando -> plan -> autorización -> ejecución -> evidencia -> resultado |
| Procesos | `nativeAutomationEngine`, `agentRunLedgerService`, `operationalEventBus` | Reintento, ACK, lease, heartbeat, recuperación, idempotencia |
| Reserva | `bookingService` y máquina canónica | Cupo confirmado, estado consistente, conflictos concurrentes |
| Pagos | Integraciones Stripe/PayPal existentes | Firma/webhook, estado server-side, conciliación, duplicados |
| Proveedores | Servicios actuales de coordinación | Respuesta real, SLA, evidencia, privacidad y cancelación |
| Operaciones | `weatherPulseService`, `itineraryService` | Fuente/fecha/TTL y cambio de plan ante condiciones |
| Dashboard | `adminControlCenterService`, `AdminControlCenterPage` | Datos medidos, fuente, cobertura, comparativas y drill-down |

## 3. Contrato de datos verificables

Cada observación material debe transportar:
```ts
type EvidenceState = 'verified' | 'stale' | 'unavailable' | 'estimated';
type EvidenceEnvelope<T> = {
  value: T | null;
  state: EvidenceState;
  source: string | null;
  observedAt: string | null;
  expiresAt?: string | null;
  coverage?: { sampled: number; totalKnown: number | null };
  correlationId?: string;
};
```
**Propuesta de contrato**, no tipo existente. No introducirlo como segundo esquema sin revisar los tipos actuales. `unavailable` no debe convertirse en 0, `estimated` no puede presentarse como verificado, y una muestra no es un total histórico.

KPIs mínimos con definición y unidad:
- Leads cualificados / leads recibidos; tasa de conversión por cohorte, región y canal.
- Reservas iniciadas, pendientes, pagadas verificadas y confirmadas por proveedor.
- Valor de reservas ≠ cobro liquidado ≠ ingreso reconocido ≠ margen neto.
- Tiempo hasta primera respuesta, cotización, aceptación proveedor y resolución.
- Tasa de éxito de workflows con denominador y ventana temporal, reintentos, DLQ, costes.
- Uso de agentes: tareas recibidas, autorizadas, iniciadas, finalizadas, rechazadas, canceladas; no usar presencia inferida como actividad.

## 4. Contrato del superagente

JARVIS no es un actor con privilegios ilimitados: es el **orquestador ejecutivo de los servicios existentes**.

1. **Observe**: lee fuentes autorizadas, datos y frescura.
2. **Diagnose**: detecta bloqueos y causas con citas a registros.
3. **Plan**: crea objetivos persistentes con subtareas, dependencias, presupuesto, SLA, riesgo y criterios de éxito.
4. **Approve**: solicita autorización humana para operaciones sensibles, comprobada en backend con identidad/rol y caducidad.
5. **Execute**: delega en agentes existentes, nunca escribe directamente pagos ni reservas sin servicios canónicos.
6. **Verify**: comprueba postcondiciones de Firestore/proveedor/pasarela, no interpreta texto del LLM como éxito.
7. **Recover**: reintenta de manera idempotente, registra errores y escala.
8. **Learn**: evalúa resultados verificados, no entrena automáticamente sobre PII ni modifica permisos.

`EnterpriseGoal` propuesto: `goalId`, `ownerId`, `objective`, `constraints`, `successMetrics`, `planVersion`, `dependencies`, `approvalPolicy`, `status`, `sourceRefs`, `auditTrail`. Estados sugeridos: `proposed`, `approved`, `running`, `waiting_external`, `waiting_approval`, `blocked`, `succeeded`, `failed`, `cancelled`. Comprobar compatibilidad con `shared/jarvisTypes.ts` antes de introducir cambios.

**Ejemplo comprobable:** «Revisa las solicitudes de rafting sin respuesta en 24 horas». JARVIS consulta leads reales -> filtra por SLA -> propone seguimiento -> solicita aprobación si procede -> usa canal existente -> registra acuse -> informa resultados; no inventa respuestas ni envía mensajes durante QA pública.

## 5. Auditoría UX multidispositivo pendiente de certificación

Perfiles: 320×568, 375×812, 390×844, 844×390, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080. El run 39459191786 cubrió siete perfiles; ampliar a la matriz completa en Work/Playwright y complementar WebKit/Firefox y móvil físico.

Recorridos obligatorios:
1. Home -> catálogo -> filtros -> ficha -> fecha/personas -> disponibilidad real o pendiente.
2. Mapa -> zoom/pan/resize -> marcador georreferenciado -> servicio correcto -> consulta (lead), sin crear booking.
3. Asistente ES/EN -> memoria autorizada -> recomendación -> itinerario -> cotización -> canal de conversión.
4. Formulario -> consentimiento -> validaciones -> recibo (solo sandbox/mock).
5. Login owner -> módulos admin -> cambio de sesión -> 401/403 para roles no autorizados.
6. Proveedor -> aceptación/rechazo -> auditoría y notificación (solo sandbox).
7. Stripe/PayPal -> webhook firmado -> reintento -> confirmación y conciliación (solo sandbox).
8. Voice -> permisos micrófono, fallbacks, privacidad y no suponer que Web Speech equivale a call center telefónico.

Cada defecto: URL, commit frontend/backend, viewport, idioma, pasos, esperado/actual, screenshot/trace, severidad, fuente y propuesta mínima.

## 6. Dependencias y orden de integración

1. **P0**: revisar credencial GCP adjunta al chat por canal seguro; confirmar si sigue activa, rotar/revocar y usar Secret Manager/WIF. Nunca registrar el JSON ni subirlo a GitHub.
2. **P0**: revisar #284 autenticación y pruebas owner/operador/visitante; no relajar Cloud Run privado.
3. **P0**: verificar estados canónicos de reserva/pago/proveedor y pendientes #174/#175; pruebas de concurrencia e idempotencia.
4. **P1**: revisar #294 precios y #299 contactos, garantizar no divulgación y fuentes válidas.
5. **P1**: reconciliar #300, #301, #303, #304, #305; evaluar archivos/rutas compartidos antes de merge.
6. **P1**: extraer y corregir los 7 hallazgos medios del artifact 12282072210.
7. **P2**: contratos de evidencias, JARVIS goals, ejecución durable y telemetría multiinstancia.
8. **P2**: dashboard empresarial con métricas trazables y acciones aprobables.
9. **P3**: proveedores B2B, hotel multi-tenant, evaluación de agentes, world model turístico y simulaciones.

## 7. Criterio de cierre

Ninguna tarea se considera completada sin: PR/commit, pruebas específicas, estado CI, SHA desplegado si aplica, verificación funcional independiente, fuente de datos, coste y rollback. Mantener distinción `LIVE_PUBLIC`, `BUILD_MOCKED`, `AUTHENTICATED_SANDBOX`, `CODE_INSPECTION`, `NOT_TESTED`.

**No fusionar ni borrar arquitectura sin aprobación del propietario.** Este documento habilita continuidad entre agentes y Work; no representa un superagente autónomo desplegado.
