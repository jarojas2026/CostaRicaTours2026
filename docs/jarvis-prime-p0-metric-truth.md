# PR-01 — Honestidad de métricas administrativas (20 octubre 2026)

## Hechos verificados en main

- `nativeAutomationEngine.ts` devolvía `activeWorkflows: 24` constante, `successRate: 100` y `averageLatencyMs: 2` como defaults sin observaciones.
- La bitácora de automatización mantiene **solo 200 eventos en memoria por instancia**. No prueba totales globales ni persiste después de reinicios.
- `adminControlCenterService.ts` presentaba valor de reservas confirmadas como `revenueUSD`, sin evidencia de conciliación.
- El frontend convertía indicadores no disponibles a cero y el lead listado se limita a 200 documentos.

## Qué cambia en este PR

1. `automationStatusMetrics.ts` calcula resultados de eventos observados. `warning` no cuenta como éxito; sin ejecuciones elegibles, éxito y duración son `null`.
2. El motor declara `activeWorkflows: null` y `averageLatencyMs: null`, porque todavía no existe un registro autoritativo de workflows activos ni telemetría end-to-end.
3. Se ofrece `averageReportedDurationMs` **solo como duración suministrada por el caller** (no latencia medida), excluyendo placeholders de 0.
4. `metricsScope` declara muestra de memoria de una sola instancia, máximo 200 registros, sin persistencia.
5. El campo legacy `business.revenueUSD` queda en `null` por seguridad semántica; se añade `confirmedBookingValueUSD`. `financialEvidence.verifiedCollectionsUSD` permanece `null` hasta integrar conciliación real.
6. El panel ES/EN muestra valor de reservas y cobros por separado, coloca N/D cuando faltan fuentes y advierte que eventos y leads son muestras limitadas.

## Qué NO resuelve (no hacer declaraciones engañosas)

- No constituye conciliación de pasarelas ni contabilidad formal.
- `getAllBookings()` todavía puede caer a memoria después de fallo Firestore; `financialEvidence.bookingValueCoverage='not_certified'` lo declara.
- No persiste la bitácora de automatización ni da estados globales de trabajos.
- No añade un conteo real de procesos activos.
- No verifica deploy, pagos, reservas ni proveedor real.
- No cambia permisos ni el flujo crítico de reservas.

## Próximas fases

1. PR independiente: construir contadores/ledger persistentes usando `agentRunLedgerService`, `operationalEventBus` y contratos de eventos existentes; evitar dobles escrituras y registros con PII.
2. PR independiente: separar libro auxiliar financiero y conciliación desde proveedores de pago, con importe, moneda, refund y deduplicación.
3. PR independiente: certificar cobertura de métricas de reservas/leads y convertir muestras en agregaciones correctamente etiquetadas.
4. Revisar PR #284 para autenticar el panel y endurecer permisos antes de añadir superficies nuevas.

## QA

- `tests/automationStatusMetrics.test.ts`: cero observaciones, solo avisos, mezcla éxito/error, duración placeholder.
- `tests/adminMetricsTruth.contract.test.ts`: contratos de integración backend/UI y prevención de métricas ficticias.
- En CI correr `npm run lint`, `npm run test:contracts`, `npm run build`, además de pruebas visuales autenticadas del panel.
- Este documento **no afirma** haber completado ninguna prueba que no se haya ejecutado.

## Reversión

Revertir commits de esta rama tras comprobar consumidores del contrato `/api/admin/control-center`. No hay cambios de datos ni migraciones Firestore.
