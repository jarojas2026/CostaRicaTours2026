# Reglas de la plataforma — Costa Rica Tours 2026

> **Documento normativo.** Reúne las decisiones del dueño (Gabriel) vigentes al **25-oct-2026**. Toda persona o agente de IA (Hark, ChatGPT/Codex, JARVIS u otro) que trabaje en este repositorio debe leerlo antes de actuar. Si algo de este archivo contradice otro documento más antiguo, **gana este archivo** hasta que el dueño decida otra cosa.
>
> Base: `main` en `b592f62` (incluye #445, #446 y #447). Repositorio **público**: no escribir aquí ni en issues/PRs secretos, ids de secretos, números de proyecto, cuentas de servicio, teléfonos o correos personales, datos de leads ni nombres/contactos de operadores.
>
> Esto es una guía técnica y de cumplimiento, **no asesoría legal**. Lo marcado "verificar" requiere abogado, contador o la institución.

---

## 0. Reglas permanentes para toda IA (26-oct-2026)

Decisión del dueño del 26-oct-2026. Aplican a cualquier IA o agente (Hark, Codex, Copilot, ChatGPT, JARVIS u otro) y **refuerzan** la tabla de §1; ante duda, gana la regla más restrictiva.

1. **Costo $0 obligatorio.** Prohibido activar o reactivar, sin aprobación explícita y escrita de Gabriel: facturación de Google Cloud, Cloud Run, Cloud Build, escaneo de vulnerabilidades (Container Scanning / On-Demand Scanning), VMs, planes pagos, Google Maps con facturación o cualquier servicio con costo. **Nada de deploys a GCP.** Los recursos de GCP se apagaron el 26-oct-2026 para detener cargos: no volver a encenderlos.
2. **Nunca borrar nada** (servicios, imágenes, repositorios, buckets, ramas, datos). Si algo sobra: desactivarlo, aislarlo o marcarlo como simulación.
3. **Stripe deshabilitado en Costa Rica Tours.** No crear checkout ni procesar webhooks; no habilitar TEST ni LIVE. No sustituir automáticamente por otra pasarela. Cualquier alternativa requiere evaluación documentada y aprobación explícita del dueño.
4. **No tocar `api/[...path].ts`, `Header` ni `BottomNav`.**
5. **No fusionar PRs** sin autorización explícita de Gabriel.
6. **Cambios mínimos, aislados y sin dañar nada.** Antes de abrir un PR: correr los tests de contratos y TSC con `NODE_OPTIONS=--max-old-space-size=6144`.
7. **Pagos a proveedores solo manuales** y registrados por el dueño. Nunca SINPE, banco ni pagos a números arbitrarios por cuenta del cliente.
8. **Responder a Gabriel en español, con voseo costarricense.**

---

## 1. Reglas no negociables

| # | Regla | Detalle |
|---|---|---|
| 1 | **Costo $0 hasta autorización** | Decisión del dueño (25-oct-2026): "mantener gastos en 0 hasta decidir cómo avanzar". Prohibido sin OK explícito y por escrito del dueño: reactivar la facturación de Google Cloud, desplegar a Cloud Run, ejecutar Cloud Build, activar planes pagos (Vercel Pro, APIs con cobro, números de WhatsApp, dominios, VPS). El CI de GitHub Actions del repo público sí se puede usar. |
| 2 | **No borrar nada** | Decisión del dueño (25-oct-2026): conservar todo lo creado. No eliminar servicios, imágenes, revisiones, activadores, ramas, colecciones, documentos, agentes ni código. En su lugar: **desactivar, pausar, marcar como obsoleto/simulado o mover a `archive/`**. Esto reemplaza cualquier propuesta anterior de limpieza (p. ej. del Artifact Registry). |
| 3 | **Stripe solo TEST** | `stripeModeGuard` bloquea LIVE (`stripe_live_blocked`). Pasar a LIVE solo con OK explícito del dueño. Ninguna UI ni agente marca un pago como pagado (ver §5). |
| 4 | **No tocar `api/[...path].ts`** | Puerta de Vercel hacia el backend. Cualquier cambio requiere autorización explícita del dueño en el issue/PR. |
| 5 | **No inventar** | Ni precios, disponibilidad, cupos, operadores, reseñas, certificaciones, métricas, confirmaciones de pago, respuestas de proveedores, facturas ni acuses de Hacienda. Sin fuente: `null` / "no disponible" / "por validar". |
| 6 | **El cliente nunca ve al proveedor** | Ver `AGENTS.md` §12 y `tests/publicOperatorPrivacy.contract.test.ts`. |
| 7 | **Aprobación humana** | Pagos, cobros, reembolsos, payouts, precios, publicaciones y mensajes a clientes siempre requieren aprobación del dueño (ver §7). |
| 8 | **Merge solo con OK del dueño** | Ver §9. |

---

## 2. Backend canónico y deploys pausados (#445)

Fusionado en `main` el 25-oct-2026 (`1a175bf`). Detalle completo en [`backend-canonico-pausa.md`](backend-canonico-pausa.md).

- Backend canónico: servicio Cloud Run `costa-rica-tours` (`us-central1`). Único workflow de publicación: `.github/workflows/deploy-cloud-run.yml`.
- Los servicios históricos `costaricatours` y `costaricatours2026` se **conservan pausados**; sus activadores de Cloud Build quedan inhabilitados. No borrarlos (regla 2) ni reactivarlos.
- **Pausa que falla cerrada:** el deploy solo corre si la variable de Actions `CLOUD_RUN_DEPLOY_ENABLED` es exactamente `true`; el resumen diario de leads (`leads-digest.yml`) igual con `CLOUD_RUN_OPERATIONS_ENABLED`. Ausente o cualquier otro valor = no se ejecuta, ni siquiera manualmente. Solo desde `main`.
- **Por defecto ambas están apagadas.** Encenderlas es gasto → requiere OK del dueño (regla 1).
- Estado informado por el dueño (23-oct-2026): la facturación de GCP está desactivada y el backend Cloud Run responde 503; el frontend en Vercel sigue en línea. Mientras siga así, las funciones que dependen del backend (pagos TEST, leads, oficina virtual) no operan en producción.
- `CLOUD_RUN_BACKEND_URL` en Vercel está guardada como Secret y no se puede leer: no declarar el routing verificado.
- **Vercel Hobby** es solo para uso no comercial (decisión del 23-oct-2026 de no migrar el backend ahí). Al empezar a vender, el frontend debe pasar a Pro o moverse de hosting → decisión y gasto del dueño.

---

## 3. Roles y acceso (#447)

Fusionado el 25-oct-2026 (`b592f62`). Hoy el equipo es **Gabriel (dueño/administrador) y Hark**.

| Rol | Cómo se determina | Qué ve / dónde |
|---|---|---|
| **Visitante** (sin sesión) | Sin cuenta de Firebase Auth | Sitio público. Ninguna sección de rol en el menú. Sin memoria entre visitas (§4). |
| **Cliente** | Usuario con sesión (Firebase Auth, `uid`) | Perfil personal normal; sus datos guardados por `uid` (§4). |
| **Proveedor** | Claims del token: `role=provider`, `providerId` válido y `providerRole` ∈ `owner`/`manager`/`staff`, sin claims de staff interno (`src/utils/accountRoles.ts` `hasProviderClaims`, espejo de `backend/providerAuth.ts`). El backend además exige `provider_members/{uid}` activo. | Bloque **Proveedores** en el menú de cuenta → `/provider/portal`. Ve solo su neto (sin bruto ni comisión). |
| **Administrador** | `GET /api/admin/access-policy` (protegida por `requireAdmin`) responde `{allowed:true}`. Caché solo en memoria por `uid`, se vacía al cambiar de identidad. | Avatar (arriba a la derecha) → bloque **Panel de administración**: Centro de control (`/admin`), Leads (`/admin/leads`), Sala de mando IA (`/admin/ai-command`), Correo (`/admin/email-operations`), Finanzas y legal (`/admin/financial-legal`). En móvil, botón **Admin** en la barra inferior (`BottomNav`). |
| **Colaboradores** | **Futuro, no implementado.** No existe rol de colaborador. | Crearlo requiere PR propio y OK del dueño; contratar personas implica obligaciones CCSS/INS (§8). Los agentes de IA no son colaboradores. |

**Los accesos del menú son solo visuales.** La autorización real está en el backend en cada ruta (`requireAdmin`, `requireOwner`, `requireProvider`) y en `AdminRouteGuard`. Nunca dar permisos por lo que muestra el frontend.

---

## 4. Privacidad de usuarios e IA (#447)

Implementado en `src/utils/privateStorage.ts`, `src/hooks/useStorageScope.tsx`, `src/utils/chatSession.ts`; cubierto por `tests/privateStorage.contract.test.ts` y `tests/accountMenuRoles.contract.test.ts`.

- **Visitantes sin memoria entre visitas:** sus datos personales (historial e id de chat IA, borradores, itinerarios, favoritos, ids de viaje/reserva) viven solo en `sessionStorage`, nunca en `localStorage`. Otra persona en el mismo navegador (PC pública, cibercafé) empieza de cero.
- **Datos por `uid`:** con sesión se guardan con clave `crt_u:<uid>:<clave>`.
- **Limpieza al cerrar sesión o cambiar de cuenta:** `setStorageIdentity()` borra los datos del `uid` anterior y los del visitante; los componentes con estado se remontan (`withStorageScope`) para no mostrar nada de otra persona.
- **IA sin memoria cruzada:** el backend solo sirve memoria conversacional a quien presente el id de sesión que emitió junto con su token HMAC (`x-chat-session-token`); ids adivinados se rechazan. Si la identidad cambia mientras se pide la sesión, el id se descarta. Ningún agente puede usar la memoria de otro usuario.
- Preferencias no personales (idioma, moneda, consentimiento de cookies, caché offline) no pasan por este módulo.
- Toda clave personal nueva debe registrarse en `PERSONAL_STORAGE_KEYS` / `PERSONAL_STORAGE_PREFIXES` y usar `getPersonalItem`/`setPersonalItem`. Prohibido `localStorage` directo para datos personales.
- Ley 8968: consentimiento antes de guardar contacto, minimización, sin datos personales en logs, dashboards ni respuestas de IA.

---

## 5. Panel de pago en `/admin/leads` (#446)

Fusionado el 25-oct-2026 (`550eaf8`). `src/components/LeadPaymentPanel.tsx`, `src/components/leadPaymentMessages.ts`, `tests/leadPaymentPanel.contract.test.ts`.

- Solo dueño. Usa endpoints existentes (#439/#441): `POST /api/admin/leads/:id/link-booking`, `POST /api/admin/leads/:id/payment-link` (checkout **Stripe TEST**), `GET /api/admin/leads/:id/payment-status` (solo lectura).
- **La UI nunca marca nada como pagado.** El pago solo se confirma por webhook firmado de Stripe o retorno verificado en el servidor. Los mensajes de error nunca afirman que se cobró ("No se generó ningún cobro").
- No hay modo LIVE desde el panel.
- Con el backend pausado (§2) el panel no puede operar en producción.

---

## 6. Oficina virtual de agentes

Estado revisado en el código el 25-oct-2026. Resumen normativo:

### 6.1 Organigrama

```
Gabriel — dueño: decide, aprueba, firma, paga
   │
Hark — director externo: trabaja con Gabriel en conversación
   (estrategia, investigación, PRs, borradores); no corre 24/7 dentro del backend
   │ órdenes y políticas
JARVIS — orquestador interno (jarvis_room): descompone órdenes y delega
   │
Oficinas: Proveeduría · Mercadeo/Contenido · Finanzas · Atención · Legal/Cumplimiento · Operaciones/Reservas
```

- Registro real: 14 agentes en 9 oficinas (`backend/agentRegistryService.ts`, `shared/agentOfficeTypes.ts`); falla cerrada si un agente no tiene oficina.
- Agentes propuestos y **todavía no creados**: `marketing_content`, `finance_analyst`, `compliance`. Al crearse, arrancan en autonomía 0.
- Lo que hoy **no** funciona (no afirmar lo contrario): nadie emite heartbeat (la oficina mostrará "sin señal"), nadie ejecuta las delegaciones de JARVIS (`agent_messages` queda `queued`), no hay pantalla para aprobar/ordenar/gobernar, y `/admin/financial-legal` reutiliza una página genérica. La oficina es una **proyección de eventos verificables**: nunca mostrar agentes "trabajando" sin heartbeat real.

### 6.2 Autonomía 0–3 y aprobación humana

- `backend/autonomyPolicy.ts`: niveles 0 a 3; **todos los agentes empiezan en 0** y solo el dueño sube el nivel, agente por agente.
- **Siempre requieren aprobación humana**, en cualquier nivel: `payment`, `refund`, `payout`, `price_change`, `publication`, `customer_message`, `mass_message`, `legal_or_policy_change`, `identity_merge`, `delete`.
- La aprobación es de **un solo uso** (`backend/agentActionGate.ts` + `backend/ownerApprovalService.ts`: hash SHA-256 del payload, se consume al ejecutar). `legal_or_policy_change`, `identity_merge` y `delete` no tienen canal automático: solo manual.
- Gobernanza: pausar, revocar y **apagado global** (`backend/agentGovernanceService.ts`). Máximo 2 reintentos ante fallos.
- Toda herramienta nueva con efectos debe pasar por `authorizeAgentAction`.

### 6.3 Prohibición de documentos simulados

- **Prohibido** generar facturas, comprobantes, acuses de Hacienda, confirmaciones de pago o de proveedor simulados que parezcan reales.
- Pendiente conocido: `backend/nativeAutomationEngine.ts` (`executeDGTElectronicInvoicingSettlement`) aún arma una "Factura Electrónica v4.3" con IVA 4 % y devuelve `estadoHacienda: 'ACEPTADO_POR_DGT'` con un acuse generado al azar; nada se envía a Hacienda. Su neutralización está en revisión en el **PR #448** (abierto, sin fusionar). Hasta que se fusione, no usar esa ruta ni citar su resultado.
- Mientras no haya integración certificada, el agente de Finanzas solo **prepara borradores** y el dueño emite el comprobante en el facturador gratuito de Hacienda (TicoFactura / TRIBU-CR).

### 6.4 Fases

- **Fase 1 ($0, solo código):** PRs pequeños — planta por oficinas del registro, retirar factura simulada (#448), bandeja de aprobaciones, consola JARVIS, gobernanza, agentes nuevos en autonomía 0, checklist legal en `/admin/financial-legal`, retracto en términos (texto con OK del dueño).
- **Fase 2 (requiere OK del dueño, implica backend activo = costo):** worker que ejecute delegaciones con heartbeat y límite de costo; herramientas reales detrás de `authorizeAgentAction`.
- **Fase 3 (después de ventas reales, con OK):** comprobantes 4.4 con proveedor certificado, Stripe LIVE, revisión legal formal.

---

## 7. Pagos y SINPE

- La plataforma **solo cobra sus propios servicios** (tours, transporte, entradas, paquetes que vende Costa Rica Tours). Luego la empresa paga a sus proveedores (por SINPE u otro medio) como cualquier compra propia.
- **No se ofrece** "pagar SINPE por el cliente" (que el cliente pague con tarjeta y la plataforma haga transferencias SINPE a terceros por él). Hacer transferencias de fondos de terceros de forma sistemática/habitual es actividad del **art. 15 de la Ley 7786**, que exige inscripción y supervisión ante SUGEF (Acuerdo SUGEF 11-18, art. 4 c: "transferencias sistemáticas sustanciales de fondos, realizadas por cualquier medio"). Además, verificar requisitos del BCCR y las condiciones de Stripe. Reabrir el tema requiere asesoría legal y decisión del dueño.
- Margen mínimo de negocio: 20 % (política del dueño).

---

## 8. Marco legal Costa Rica (checklist)

Estado: ✅ cubierto · 🟡 parcial · ❌ falta · ❓ depende de trámites del dueño (no confirmado).

| Tema | Qué exige (resumen) | Estado | Fuente |
|---|---|---|---|
| **Ley 8968 / PRODHAB** — datos personales | Consentimiento informado; derechos de acceso, rectificación y supresión; seguridad; aviso de brecha. Inscripción de base de datos obligatoria si se usa para distribución, difusión o comercialización (art. 21). | 🟡 consentimiento en leads ✅; falta protocolo de brechas y registro de solicitudes; inscripción ❓ (verificar) | https://www.prodhab.go.cr/preguntasfrecuentes.aspx · https://pgrweb.go.cr/scij/Busqueda/Normativa/Normas/nrm_texto_completo.aspx?nValor1=1&nValor2=70975&nValor3=85989&param1=NRTC |
| **Factura electrónica 4.4** | Versión 4.4 obligatoria desde 1-sep-2025; TRIBU-CR con facturador gratuito. | ❌ en código (y simulación pendiente de retirar, #448) | https://www.hacienda.go.cr/docs/ComprobantesElectronicos-GeneralidadesyVersion4.4.marzo2025.pdf |
| **IVA** | Tarifa general 13 % (Ley 9635). Servicios turísticos al 13 % desde jul-2023 (fuentes secundarias). Como intermediario, confirmar con contador si se factura comisión o servicio completo. | 🟡 asistente usa 13 %; la factura simulada usa 4 % ❌ | https://www.icoder.go.cr/fileadmin/documentos/tramites/caja_de_herramientas/leyes_y_sus_reglamentos/Ley_N__9635_de_Fortalecimiento_de_las_Finanzas_P%C3%BAblicas.pdf |
| **ICT** — agencia de viajes en línea | Ley 5339; requisitos de declaratoria para agencias en línea (domicilio, CCSS/Hacienda al día, seguros, etc.). Publicar productos solo con consentimiento del operador. | ❓ declaratoria propia no confirmada; los textos públicos dicen verificar la de los operadores: debe cumplirse en la operación | https://www.ict.go.cr/es/documentos-institucionales/legislaci%C3%B3n-de-empresas/leyes-y-reglamentos/582-ley-reguladora-de-las-agencias-de-viajes.html |
| **Ley 7472** — consumidor, retracto | Art. 40 y Reglamento 37899-MEIC: retracto de 8 días (hábiles según reglamento) en ventas a distancia/electrónicas; informar condiciones antes de comprar. Aplicación a servicios con fecha cercana: verificar con abogado. | 🟡 términos citan la ley pero no explican el retracto | https://pgrweb.go.cr/scij/Busqueda/Normativa/Normas/nrm_texto_completo.aspx?nValor1=1&nValor2=26481&nValor3=102674&param1=NRTC&strTipM=TC |
| **Ley 8454** — firma digital | Firma digital certificada = valor de firma manuscrita (art. 9). Los agentes **nunca firman**. | ❓ | https://pgrweb.go.cr/scij/Busqueda/Normativa/Normas/nrm_texto_completo.aspx?nValor1=1&nValor2=55666&nValor3=60993&param1=NRTC&strTipM=TC |
| **Ley 7786 / SUGEF art. 15** | Transferencias sistemáticas de fondos de terceros exigen inscripción SUGEF. | ✅ por diseño: no se ofrece (§7) | https://www.sugef.fi.cr/normativa/normativa_vigente.aspx · https://pgrweb.go.cr/scij/Busqueda/Normativa/Normas/nrm_texto_completo.aspx?nValor1=1&nValor2=87558&nValor3=128357&param1=NRTC&strTipM=TC |
| **CCSS / INS** | Al contratar personas: seguro de riesgos del trabajo (INS) y CCSS. | ❓ hoy sin colaboradores | https://www.mtss.go.cr/elministerio/marco-legal/documentos/Codigo_Trabajo_RPL.pdf |
| **Patente municipal** | Licencia de actividad lucrativa en el cantón (supuesto: Pérez Zeledón). | ❓ | https://www.perezzeledon.go.cr/tramites-en-linea/gestiones/licencias-y-patentes.html |
| **Decisiones automatizadas** | La Ley 8968 vigente no lo regula expresamente; aun así, ninguna decisión con efectos para el cliente (precio, rechazo, reembolso, cancelación) sin humano. | ✅ por política (§6.2) | — |

---

## 9. Flujo de trabajo de PRs

1. `git fetch origin` y rama nueva desde `origin/main` actual (un tema por PR; preferir **worktree** propio, `node_modules` por symlink si hace falta).
2. Cambio mínimo; leer antes de editar; no tocar archivos ajenos ni `api/[...path].ts`.
3. Tests de contrato: `npm run test:contracts` (y el test nuevo que cubra el cambio).
4. Tipos: `NODE_OPTIONS=--max-old-space-size=6144 npm run lint` (`tsc --noEmit`; sin el límite de memoria falla por heap). El CI usa 4096.
5. Antes de subir, confirmar que el push no dispare Cloud Build ni deploy (§2).
6. Abrir PR en español, con alcance, pruebas y riesgos. **CI verde** obligatorio (Build & Type Check, E2E, Python).
7. **Merge (squash) solo con OK explícito de Gabriel.** Nunca force-push a `main`.
8. Si choca el snapshot de rutas: `UPDATE_ROUTE_SNAPSHOT=1 npx vitest run tests/serverRoutes.contract.test.ts` sobre la rama rebasada y revisar el diff.
9. Máximo 2 reintentos ante un fallo repetido; luego detenerse y reportar.

---

## 10. Stack libre recomendado y licencias a vigilar

Investigación del 25-oct-2026 (datos de GitHub). Nada de esto está instalado ni desplegado; adoptar cualquier pieza requiere PR y, si necesita servidor, OK del dueño (regla 1).

| Uso | Recomendado | Licencia |
|---|---|---|
| Traducción y SEO de la web | react-i18next, Vike | MIT — corren en el frontend actual |
| Pagos | stripe-node | MIT |
| CMS de catálogo | Payload / Strapi | MIT |
| Bandeja WhatsApp/web/email | Chatwoot | MIT (carpeta `enterprise/` aparte) |
| Entradas / eventos | Hi.Events, pretix | ⚠️ AGPL-3.0 (Hi.Events exige "Powered by") |
| Reservas por horario | Easy!Appointments | GPL-3.0 |
| ERP / contabilidad | ERPNext + HRMS (GPL-3.0), Odoo CE (LGPL-3.0) | — |
| Agentes | LangGraph (MIT), CrewAI (MIT), Google ADK (Apache-2.0), MCP servers, Claude Agent SDK (MIT) | — |
| Video y contenido | MoneyPrinterTurbo (MIT), auto-editor (Unlicense), LosslessCut (GPL-2.0), faster-whisper (MIT), whisperX (BSD-2), Kokoro (Apache-2.0), Piper (GPL-3.0) | — |
| Publicar / newsletter / medir | Postiz (⚠️ AGPL), Listmonk (⚠️ AGPL), Umami (MIT), Shlink (MIT) | — |
| Modelos locales | Gemma 4, Qwen3.6, Mistral Small 4 (Apache-2.0) | — |

**Licencias a vigilar:**
- **AGPL-3.0** (Hi.Events, pretix, Postiz, Listmonk, Twenty, Plausible, Dub): si se modifica y se ofrece como servicio a terceros, hay que publicar el código modificado. Uso interno sin modificar: aceptable. Nunca mezclar código AGPL dentro de este repositorio.
- **No libres / con límites comerciales:** n8n (Sustainable Use: solo uso interno), Dify (Apache modificada: sin multi-tenant), Directus (MSCL), Typebot (FSL), Invoice Ninja (Elastic 2.0), Akaunting (BSL), Remotion (licencia para empresas > 3 personas), modelos F5-TTS (CC-BY-NC, no comercial), licencias propias de Meta (Muse) y NVIDIA. Revisar antes de usar.
- **Descartados:** Attendize, ShortGPT y coqui-ai/TTS (abandonados); Cal.com cerró su código en abr-2026 y Cal.diy no se recomienda para producción.
- **Modelos IA:** las suscripciones personales de ~USD 20 (ChatGPT Plus, Claude Pro) no sirven para que la plataforma llame al modelo; la plataforma necesita llaves API (pago por uso). Para $0: plan gratis de Gemini API (cupos sin verificar) o modelos locales.
- No ejecutar repositorios de procedencia dudosa (estrellas infladas, listas copiadas), p. ej. `morluto/rea`.
- Hark no se puede clonar ni replicar por ingeniería inversa; el patrón (director + especialistas en paralelo + herramientas MCP + memoria por persona + aprobación humana + router de modelos) se construye con código propio y libre.

---

## 11. Historial de esta versión

- 25-oct-2026: primera versión, a partir de las decisiones del dueño en la conversación de trabajo con Hark (#445, #446, #447 fusionados; #448 abierto).
