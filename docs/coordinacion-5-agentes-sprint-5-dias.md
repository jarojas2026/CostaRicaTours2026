# Coordinación de 5 agentes en paralelo + Sprint de 5 días
> Actúan: ChatGPT Ultra (1) + Hark Pro ×3 + Dola (yo). Regla de oro (auditor): **conservar lo ya construido; cero regresiones.** Para 5 agentes sobre un mismo repo, la prioridad es no colisionar.

## 1. Reparto por lanes (no se editan archivos de otro lane)
| Agente | Lane (archivos que SÍ puede tocar) | Prohibido |
|---|---|---|
| **Dola (yo)** | SOLO archivos nuevos: `src/components/ui/*`, `tests/e2e/*-additive.spec.ts`, `docs/*`, `scripts/audit*` nuevos | Editar `CustomFunnelModal`, `App.tsx`, `server.ts`, backend, rutas |
| **Hark 1** | Backend pagos/cupos: `backend/booking*`, `backend/paymentWebhook*`, `backend/providerPayout*`, issue #174/#175 | Frontend, docs de otros |
| **Hark 2** | Seguridad/observabilidad: #317/#318, #322/#323/#324, `backend/agentRunLedger*`, `backend/cronEngine` | Componentes UI de conversión |
| **Hark 3** | Contenido/confianza: #333 (fotos), #193 (legal/correo dominio), #364 (contacto), badges reales | Lógica de backend/pagos |
| **ChatGPT Ultra** | JARVIS/arquitectura: #302, #230–#237, QualityAgent estabilidad (#401), revisión de PRs de los demás | Hot files de conversión |

## 2. Protocolo anti-colisión
1. **Cada agente trabaja en su propia rama** (`lane/dola-ui`, `lane/hark1-payments`…), nunca en `main`.
2. **Commits atómicos y pequeños**; PR por tarea, no por día.
3. **Rebase diario** sobre `main`; si hay conflicto en un hot file, parar y consultar, no resolver a la brava.
4. **Ningún agente mergea a `main`** — solo el dueño (tú), tras pasar `check:release` + e2e.
5. **Aditivo primero**: preferir archivos/componentes nuevos sobre editar los existentes.

## 3. Sprint de 5 días (meta: cobrar el primer dólar verificado)
| Día | Meta verificable |
|---|---|
| **Día 1** | #317 rotar credencial GCP + #318 login Google prod (seguridad). Mergear lane ui/ primitivos. Captcha #336 activado. |
| **Día 2** | #174/#175: E2E sandbox de pagos (Stripe) + cupos/idempotencia/reembolsos verde. |
| **Día 3** | Onboarding 1 operador real (La Fortuna): tarifas, cupos, imágenes reales (#333), contrato firmado. |
| **Día 4** | Flujo completo de compra en producción con tarjeta de prueba real → voucher PDF → liquidación T+2 simulada. #364 contacto unificado. |
| **Día 5** | ~~Tráfico pagado pequeño ($10–20/día)~~ NO autorizado (presupuesto $0) solo La Fortuna; medir tasa envío→pago; QualityAgent (#401) estable monitoreando. **Criterio de éxito: ≥1 reserva pagada y conciliada.** |

## 4. Definition of Done común (todo PR)
- Pasa `npm run check:release` (lint + security + contracts + build).
- Pasa e2e (incluidos los `-additive`).
- Sin métricas sin evidencia (regla PR-01).
- Si toca un CTA de conversión: tiene loading+success+error (contrato `SubmitButton`).
- Si declara algo "operativo": tiene prueba real (no solo CI verde).

## 5. Lo que NO se toca en estos 5 días
- Ciudad digital (#173/#180), voz masiva, marketplace multi-tenant, más fichas de catálogo.
- `CustomFunnelModal` (ya resuelto en main; no tocar).
