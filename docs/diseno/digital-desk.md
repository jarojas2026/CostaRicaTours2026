# Digital Desk — Escritorio de ventas turísticas digital para hoteles y agencias

**Proyecto:** Costa Rica Tours (Zanibentech) · **Dueño:** propietario del proyecto · **Fecha:** 2026-10-20 · **Estado:** propuesta de producto (documento de diseño; repo aún no creado)

**Nombre de trabajo:** "Digital Desk" (alternativa "Agent Desk"). El nombre final es decisión del dueño (§14).

> Convención: toda cifra lleva fuente. Lo que no tiene fuente dice **"por validar"**. Las propuestas de precio son **hipótesis**, no datos de mercado.

---

## 1. La idea en una frase

El *tour desk* del lobby (un ejecutivo que vende tours, transporte y paquetes y planifica la estadía) convertido en un **ejecutivo digital con IA** que atiende al huésped por QR en la habitación, tablet en el lobby, web del hotel y WhatsApp; con un **panel para el ejecutivo humano** del hotel; y una **versión marca blanca** para agencias de viajes que cargan su propio material y venden con nuestra IA.

---

## 2. Qué ya existe en CRT y se reutiliza

Revisado en `main` (commit `2c8f2f9`):

| Pieza existente | Uso en Digital Desk |
|---|---|
| `counterDeskService.ts` (`askCounterDesk`, canal `hotel` cuando llega `hotelId`/`room`) y `public/counter-widget.js` (widget incrustable) | Precedente directo del widget y del agente "mostrador". |
| `voiceAgentDeskService.ts` + `docs/portable-voice-agent-desk.md` (hotel por DID/PBX/SIP, "no confiar en `room` para autorizar pagos") | Canal de voz opcional en fase posterior; misma regla de seguridad. |
| `commerceCatalog.ts`, `agentSkillPack.ts` (`quotePrice`, `compareTours`, `planItineraryOutline`, `getCancellationPolicy`) | Catálogo CRT y cotizador: única fuente de precios para productos CRT. |
| `checkCounterAvailability` / `checkTourAvailability` | Disponibilidad (nunca inventada). |
| `leadPipeline.ts` (+ consentimiento Ley 8968), `customerIntakeGateway.ts` | Captura de solicitudes del huésped. |
| JARVIS (`jarvisOrchestrator`, `ownerApprovalService`, `agentRunLedgerService`, `operationalEventBus`) | Orquestación, aprobaciones, bitácora de corridas, eventos. |
| Portal de proveedores (ver `portal-proveedores.md`) | Los proveedores CRT siguen operando igual; el hotel nunca ve al proveedor. |
| WhatsApp (ver `whatsapp-modos.md`) | Modos Manual/Semi/Auto se aplican por tenant. |

---

## 3. Análisis de mercado (Costa Rica)

### 3.1 Tamaño

| Dato | Valor | Fuente |
|---|---|---|
| Llegadas internacionales 2025 (todas las vías) | 2.943.991 (+0,8%) | La Nación, 15-ene-2026, con datos ICT: https://www.nacion.com/economia/visitacion-turistica-en-costa-rica-cierra-2025-con/XWCETNHXI5GZRFGWEE7SEXD62Q/story/ |
| Llegadas 2025 vía aérea | 2.689.278 (+1%) | El Observador, datos ICT: https://observador.cr/ingreso-de-turistas-a-costa-rica-registro-en-2025-el-crecimiento-mas-bajo-de-la-ultima-decada |
| Mercados emisores 2024 | EE. UU. 56%, Canadá 9%, Europa ~17% | OCDE Tourism Trends 2026: https://www.oecd.org/en/publications/oecd-tourism-trends-and-policies-2026_3fd3cd75-en/full-report/costa-rica_203ff139.html |
| Meta país | 3,8 millones de llegadas en 2027 | OCDE (misma fuente) |
| Oferta de hospedaje 2024 | 3.068 establecimientos, 56.106 habitaciones; 766 con Declaratoria Turística ICT | Boson Planning citando el Sistema de Planta Turística del ICT: https://www.bosonplanning.com/turismo/panorama-nacional-hospedaje-y-turismo-costa-rica-2024 — **validar con el PDF "Oferta Hospedaje 2003-2025" del ICT**: https://www.ict.go.cr/es/estadisticas/cifras-turisticas.html |
| Hoteles con tour desk físico | **Por validar** (no encontré estadística pública). Levantamiento propuesto: muestreo de 30 hoteles en 3 zonas. |

Lectura: el segmento objetivo inicial (hoteles con declaratoria y huésped internacional) ronda **766 propiedades** (proxy, por validar). El huésped es mayoritariamente angloparlante → el agente debe ser bilingüe ES/EN como mínimo.

### 3.2 Comisiones típicas

| Canal | Comisión | Fuente |
|---|---|---|
| Hotel concierge / activity desk (Caribe) | 15%–20% | Junglebee: https://junglebee.com/blog/set-tour-net-rates-without-killing-profit |
| Hotel concierge (referencia general) | ~20%–25% al hotel | Junglebee: https://junglebee.com/blog/using-customer-rating-and-metrics-to-improve-your-tour-activity-business |
| Ejemplo real CR (Manuel Antonio) | 15% del precio publicado, mínimo $5 por huésped, sin exclusividad | programa público de socios hoteleros de un operador local (fuente omitida por privacidad de operadores) |
| OTAs (Viator, GetYourGuide) | 20%–30% | Junglebee (arriba); caso público de un operador CR (fuente omitida) |
| Mayoristas / receptivos / DMC | 25%–30% | TrekkSoft: https://www.trekksoft.com/en/blog/how-much-commission-should-you-pay-for-distribution |
| Recargo de concierges en La Fortuna / Manuel Antonio sobre precio de operador | 20%–40% (afirmación de blog, **por validar**) | https://www.costarica-spirit.com/guides/costa-rica-adventure-tour-pricing |

Implicación: para que el hotel adopte Digital Desk, su participación sobre ventas del catálogo CRT debe ser comparable a lo que ya recibe (≈15%), y CRT debe conservar margen después de pagar al proveedor. **El margen real de CRT por tour está por validar** (depende de `commissionRate` por proveedor en `operators`).

### 3.3 Competidores SaaS (precios publicados)

| Producto | Qué es | Precio publicado | Fuente |
|---|---|---|---|
| **Conciary** | Concierge digital monetizable, QR, comisión al hotel | Tier A €2,10/hab/mes (100% comisión al hotel); Tier B €1,00/hab/mes (comisión 35% hotel / 65% Conciary); facturado 50–350 hab | https://conciary.app/ |
| **TourDesk** (Islandia) | Venta de tours para hoteles; sistema de agente para recepción | Desde $100/mes o modelo gratis con comisión | Hotel Tech Report: https://hoteltechreport.com/compare/eleanor-vs-tourdesk |
| **Planniac** | Herramientas de concierge/recepción, upsell de tours y traslados | "menos de $2 por día", 0% comisión | https://planniac.com/ |
| **Stippl for Hotels** | Concierge digital por QR; el hotel cobra comisiones de referidos | No publicado | https://portal.stippl.io/for-hotels |
| **Duve** | App del huésped, check-in, upsells | Mínimo $120/mes (Basic); €5–€9/hab/mes; onboarding €600 | https://duve.com/pricing/ y https://hoteltechinsight.com/vs/duve-vs-asksuite/ |
| **STAY** | App del huésped | Desde $300/mes | https://hoteltechreport.com/compare/mobile-app-staymyway-vs-stay-app |
| **Eleanor** | Operación de resort + reservas de actividades | Desde $700/mes | https://hoteltechreport.com/compare/eleanor-vs-tourdesk |
| **Pxier** | Reservas de actividades para hoteles/operadores | $49 y $99/mes, 0% comisión | https://www.pxier.com/en/activities-booking-software |
| **Marriott Activities** | Concierge digital y directorio para propiedades Marriott | No publicado | https://activities.marriott.com/upgrade |

Software para agencias/operadores (referencia para la marca blanca):

| Producto | Precio | Fuente |
|---|---|---|
| Bókun | $49/mes + 1,5%; $149 + 1,25%; $499 + 1% | https://automate.travel/booking-engine-pricing/ y https://www.bokun.io/pricing |
| Rezdy | $49 / $99 / $249 por mes + 3% por reserva online | https://rezdy.com/pricing/ |
| FareHarbor | Sin mensualidad; hasta 6%–8% de cargo en reservas online | https://www.bokun.io/es/tour-operator-software |

**Hueco de mercado observado:** los competidores son directorios/apps de huésped o motores de reserva. Ninguno de los revisados publica un **agente de ventas conversacional que planifique la estadía y venda con inventario y precios verificados del destino**, en español/inglés y con conocimiento local de Costa Rica. Esto es una observación de las páginas revisadas, no un estudio exhaustivo (**por validar** con demos de Conciary, TourDesk y Stippl).

---

## 4. Propuesta de valor

**Para el hotel**
- Vende tours/transporte 24/7 sin ampliar personal; el ejecutivo humano atiende solo lo que aporta valor.
- Ingreso nuevo y medible por placement (QR habitación 204, tablet lobby, web).
- Planificación de estadía bilingüe con precios y disponibilidad reales, no folletos desactualizados.
- Cero riesgo operativo: CRT coordina proveedores, pagos y cambios.

**Para la agencia (marca blanca)**
- Su marca, su catálogo y su conocimiento cargados en una IA que vende y cotiza.
- Opción de complementar con el catálogo CRT (con revenue share) cuando no tienen el producto.
- Panel para sus vendedores con toma de control y métricas.

**Para el huésped**
- Respuesta inmediata en su idioma, itinerario coherente, precios claros, sin tener que bajar app.

---

## 5. Segmentos (orden de ataque sugerido)

1. **Hoteles boutique y medianos (20–150 hab.) en zonas de actividad** — Pacífico Sur (Dominical/Uvita), Manuel Antonio, La Fortuna. Tienen demanda de tours y poco personal. Piloto ideal.
2. **Hoteles con tour desk físico** que quieren extender horario/idiomas (el humano se queda con el panel).
3. **Agencias de viajes receptivas pequeñas** (marca blanca) con catálogo propio.
4. Fase posterior: cadenas, alquileres vacacionales (property managers), operadores de transporte.

Tamaño por segmento: **por validar** (levantamiento §3.1).

---

## 6. Modelos de ingreso (hipótesis para validar con el piloto)

| Modelo | Mecánica | Hipótesis inicial (no es dato) | Comparable |
|---|---|---|---|
| **A. Revenue share (hotel, catálogo CRT)** | Huésped compra tour del catálogo CRT; CRT cobra, paga al proveedor y comparte con el hotel | Hotel recibe un % del precio de venta similar al 15% que ya recibe de operadores, financiado del margen CRT | operador local 15%; Conciary Tier B |
| **B. Suscripción (hotel)** | Cuota fija o por habitación por usar el desk (incluye catálogo propio del hotel: spa, restaurante, traslados propios) | Rango de mercado observado: €1–€9 por habitación/mes o $100–$300/mes por propiedad | Conciary, Duve, STAY, TourDesk |
| **C. Híbrido (recomendado para piloto)** | **Gratis para el hotel** con revenue share sobre catálogo CRT; suscripción solo si el hotel quiere vender su catálogo propio o quitar marca CRT | — | Conciary Tier A/B, TourDesk |
| **D. Marca blanca (agencia)** | Suscripción mensual por tenant + excedente por conversaciones; 0% sobre su propio catálogo; revenue share si vende catálogo CRT | Por validar | Bókun/Rezdy ($49–$249 + %), Pxier ($49–$99, 0%) |

Costos variables a cubrir por tenant: LLM (Groq `gpt-oss-120b` $0,15/M entrada, $0,60/M salida — https://console.groq.com/docs/model/openai/gpt-oss-120b), WhatsApp si el tenant lo activa (ver `whatsapp-modos.md` §7), hosting. Estimación de margen por tenant: **por validar** tras 30 días de piloto.

Regla: sin cobro ni gasto hasta que el dueño apruebe precios y contrato.

---

## 7. Multi-tenant

**Tenant = hotel o agencia.** Un tenant tiene propiedades (un grupo hotelero puede tener varias), miembros, agentes, base de conocimiento, catálogo y canales.

### 7.1 Aislamiento

- `tenantId` en **custom claims** del usuario y en cada documento; el backend **siempre** deriva `tenantId` del token o de la clave del canal (QR/widget), nunca del body.
- **Base de conocimiento aislada**: documentos y fragmentos con `tenantId`; la recuperación filtra por `tenantId` en la consulta del servidor **antes** de llegar al modelo. El modelo nunca recibe contenido de otro tenant.
- **Catálogo**: `catalogo propio` (tenant) + `catálogo CRT` (opcional, activable por tenant). Los ítems CRT se leen en vivo de la API de CRT (precio/disponibilidad no se copian).
- **Datos del huésped**: por tenant; CRT solo recibe lo necesario cuando el huésped solicita un producto CRT (con consentimiento).
- Reglas de Firestore con `resource.data.tenantId == request.auth.token.tenantId` y lectura vía API (igual que el portal de proveedores).
- Tests de contrato de aislamiento obligatorios en cada PR que toque datos.

### 7.2 Modelo de datos (base de datos Firestore separada, ver §10)

```
tenants/{tenantId}
  type: hotel|agency, name, brand{logo, colors, agentName, tone}, locales['es','en'],
  plan: pilot|share|subscription|whitelabel, crtCatalogEnabled, revShareRate?,
  status, contractRef, createdAt

tenants/{tenantId}/properties/{propertyId}
  name, address, geo, rooms, timezone:'America/Costa_Rica'

tenants/{tenantId}/members/{uid}
  role: owner|manager|agent(ejecutivo humano)|viewer

tenants/{tenantId}/placements/{placementId}
  kind: qr_room|qr_lobby|kiosk|web_widget|whatsapp, label ('Hab. 204', 'Tablet lobby'),
  publicKey (para URL/widget), allowedOrigins[], active

tenants/{tenantId}/kb_documents/{docId}
  title, sourceType: pdf|url|text, uploadedBy, status, validFrom, validUntil, version
tenants/{tenantId}/kb_chunks/{chunkId}
  docId, text, embedding (vector), lang

tenants/{tenantId}/catalog/{itemId}
  kind: tour|transfer|package|in_house, title{es,en}, description, priceUSD, priceSource,
  priceValidUntil, availabilityMode: request|fixed_slots|external, active
  # sin priceSource/priceValidUntil vigente, la IA NO cita precio: ofrece cotizar

tenants/{tenantId}/agents/{agentId}
  persona, languages, allowedTools[], catalogs['own','crt'], mode: manual|semi|auto,
  escalationRules, promptVersion

tenants/{tenantId}/sessions/{sessionId}
  placementId, channel, locale, startedAt, consent{...}, guestRef?, status
tenants/{tenantId}/sessions/{sessionId}/messages/{msgId}

tenants/{tenantId}/requests/{requestId}
  sessionId, items[{source:'own'|'crt', itemId, date, pax}], status,
  crtRequestRef? (id del lead/solicitud en CRT), valueUSD, commissionUSD?, placementId

tenants/{tenantId}/metrics_daily/{yyyymmdd}
  values{...}, sourceCount, metricsVersion
```

---

## 8. Canales

| Canal | Implementación | Notas de seguridad |
|---|---|---|
| **QR en habitación** | URL `desk.<dominio>/t/{tenantKey}/p/{placementKey}` → PWA de chat. El número de habitación es solo atribución. | No se usa la habitación para autorizar cargos ni para identificar al huésped (misma regla de `portable-voice-agent-desk.md`). |
| **Kiosco/tablet en lobby** | La misma PWA en modo kiosco: pantalla completa, reinicio de sesión tras 2 min de inactividad, sin guardar datos en el dispositivo, botón "enviarme el itinerario" por email/WhatsApp con consentimiento. | Bloqueo del navegador del dispositivo (configuración del hotel). |
| **Web embebible** | Script tipo `counter-widget.js` con `data-tenant-key` y lista blanca de orígenes (`allowedOrigins`). | CORS estricto; rate limit por clave. |
| **WhatsApp** | Fase 2+: número del tenant (requiere que CRT opere como proveedor tecnológico de Meta o que el tenant tenga su propia cuenta) o número compartido de CRT con código de entrada por QR. | Modos Manual/Semi/Auto de `whatsapp-modos.md`. Requisitos de Meta para multi-cliente: **por validar**. |
| Voz (opcional) | `voiceAgentDeskService` existente con `hotelId`. | Costos de telefonía: por validar. |

---

## 9. Ejecutivos de ventas digitales + panel del ejecutivo humano

**Agente IA por tenant** (configuración, no código distinto): nombre y tono de la marca, idiomas, herramientas permitidas (`searchCatalog`, `quote`, `checkAvailability`, `planStay`, `createRequest`, `handoffToHuman`), catálogos activos, reglas de escalado. Se apoya en JARVIS con `tenantId` en el contexto y registro en `agentRuns`.

Guardas idénticas a CRT: no inventa precios ni disponibilidad; no confirma reservas ni pagos sin evidencia; no revela proveedores; deriva a humano cuando se pide o cuando el riesgo lo amerita.

**Panel del ejecutivo humano (hotel/agencia)**
- Bandeja de sesiones en vivo con prioridad (intención de compra, valor, idioma).
- **Tomar conversación** / devolver a IA; borradores para aprobar (modo Semi).
- Ficha de solicitud: ítems, fecha, pax, estado (CRT actualiza el estado de los ítems CRT).
- Ventas y comisiones del tenant; ranking por placement y por ejecutivo.
- Gestión de base de conocimiento (subir PDF, URL, texto; marcar vigencia) y catálogo propio.
- Preguntas sin respuesta (huecos de la base de conocimiento) para completar.

---

## 10. Arquitectura recomendada

### 10.1 Opciones

| Opción | Pros | Contras |
|---|---|---|
| **1. Dentro del repo CRT** (nuevas rutas y páginas) | Reutilización inmediata; un solo despliegue | Mezcla datos de terceros (hoteles/agencias) con el núcleo CRT; riesgo de fuga entre tenants y de que la marca CRT aparezca en marca blanca; el repo ya es grande y con muchos contratos de prueba; ciclos de despliegue acoplados. |
| **2. Repo nuevo (frontend + `desk-api`) que consume una API interna versionada de CRT** — **recomendada** | Aislamiento contractual y técnico por tenant; marca blanca limpia; se puede vender a agencias que no usan catálogo CRT; despliegue independiente; CRT sigue siendo la única fuente de precios/disponibilidad | Hay que definir y mantener la API interna; un servicio más en Cloud Run. |
| 3. Producto totalmente independiente (sin CRT) | Máxima separación | Pierde el principal diferenciador (catálogo y operación CRT); duplica JARVIS. |

### 10.2 Recomendación: Opción 2

```
Huésped (QR / kiosco / widget / WhatsApp)
        │
        ▼
Digital Desk Web (React+Vite+TS, Vercel; PWA)        Panel del ejecutivo (misma app, rutas protegidas)
        │                                                     │
        └────────────────────▶ desk-api (Express 5, Cloud Run) ◀┘
                                  │  - auth tenant (claims), placements, sesiones
                                  │  - KB por tenant (Firestore DB "desk", vector search)
                                  │  - orquestación del agente (adaptador OpenAI-compatible → Groq)
                                  │  - métricas por tenant
                                  │
                   identidad de servicio (OIDC / Cloud Run invoker)
                                  ▼
                CRT API interna v1 (en el repo CRT, rutas nuevas y pequeñas)
                  GET  /internal/v1/catalog           (solo campos públicos, sin proveedor)
                  POST /internal/v1/quote              (quotePrice)
                  POST /internal/v1/availability       (checkTourAvailability)
                  POST /internal/v1/requests           (crea lead/solicitud con consentimiento y tenantId de atribución)
                  GET  /internal/v1/requests/:ref      (estado, sin datos del proveedor)
```

Justificación concreta:
1. **Aislamiento**: los datos de huéspedes de cada hotel viven en una base de datos Firestore separada (Firestore admite varias bases por proyecto; o un proyecto GCP separado — decisión según costo/gestión), no en las colecciones de CRT.
2. **Regla "el cliente nunca ve al proveedor"** se refuerza: la API interna de CRT no expone proveedor.
3. **"No inventar precios/disponibilidad"**: el desk no copia precios CRT; los consulta en vivo.
4. **Marca blanca**: el frontend del desk no contiene marca CRT; la marca viene del tenant.
5. **Reutilización real**: el adaptador LLM, el patrón de guardas, el widget y los componentes UI se copian/empaquetan; la lógica de comercio se **llama**, no se duplica.
6. **Costo**: un servicio Cloud Run adicional y Vercel; dentro de capas gratuitas a volumen de piloto (**por validar** con la facturación actual). Sin gasto sin autorización.

Opción de bajo riesgo para el piloto: el repo nuevo puede empezar como un solo paquete (web + api) y separarse después.

### 10.3 Seguridad mínima del desk-api
- Claves públicas de placement con rotación; rate limit por clave e IP.
- `tenantId` siempre del servidor; tests de aislamiento.
- Prompt del agente con contexto del tenant y recuperación filtrada; registro de herramientas llamadas.
- Moderación de contenido subido a la base de conocimiento (sin datos personales; aviso al subir).
- Bitácora de auditoría por tenant.

---

## 11. Métricas por tenant

| Métrica | Definición |
|---|---|
| Sesiones por canal y placement | Sesiones iniciadas por QR/kiosco/web/WhatsApp, por placement |
| Tasa de conversación | sesiones con ≥1 mensaje del huésped / sesiones |
| Solicitudes | sesiones que generan `requests` |
| Conversión a pago | solicitudes con pago verificado (CRT o sistema del tenant) / solicitudes |
| GMV y ticket promedio | Σ valor pagado; GMV / reservas pagadas |
| Comisión del hotel | Σ `commissionUSD` de ítems CRT pagados y completados |
| % resuelto por IA / % escalado | por agente |
| Tiempo de primera respuesta (humano) | en escaladas |
| CSAT | encuesta de 1 toque al cierre |
| Huecos de conocimiento | preguntas sin respuesta por tema |

Mismo principio que el portal de proveedores: cada número con fuente, versión de cálculo y "datos insuficientes" si n<5.

---

## 12. Legal

- **Ley 8968**: consentimiento informado al inicio de cada sesión (art. 5); finalidades separadas (atención vs. marketing); minimización; derechos de acceso/rectificación/supresión. Texto: https://pgrweb.go.cr/scij/Busqueda/Normativa/Normas/nrm_texto_completo.aspx?nValor1=1&nValor2=70975&param1=NRTC
- **Roles de tratamiento** (por validar con abogado): para catálogo propio del tenant, el **tenant es responsable** y Zanibentech **encargado**; para ventas del catálogo CRT, CRT es responsable de los datos necesarios para la reserva. Contrato de encargo de tratamiento con cada tenant.
- **Inscripción PRODHAB**: obligatoria para bases con fines de distribución/difusión/comercialización (art. 21); canon $200/año (art. 33) según PRODHAB: https://www.prodhab.go.cr/noticias/comunicados/2020/INSCRIPCIONBASESDEDATOSYPAGODECANON.pdf. Si aplica a Digital Desk: **por validar**.
- **Transferencia internacional** (Groq, Meta, Vercel fuera de CR): informar y obtener consentimiento; **por validar**.
- **Turismo/ICT**: si el hotel o CRT necesita registro como agencia para vender tours: **por validar** con ICT.
- **Consumidor**: información clara de precio total, impuestos y políticas de cancelación antes del pago (Ley 7472, **por validar** con abogado).
- **Contrato con el hotel** (puntos mínimos): objeto y alcance; marca y uso de logos; revenue share (base de cálculo, devengo solo en servicios **pagados y completados**, plazo y método de pago, retenciones por reembolsos); no exclusividad; quién cobra al huésped; responsabilidad operativa del proveedor y pólizas; protección de datos y encargo de tratamiento; SLA y soporte; propiedad del contenido de la base de conocimiento; terminación y portabilidad de datos; jurisdicción Costa Rica.
- **Contrato con agencia (marca blanca)**: suscripción, límites de uso, propiedad de datos y contenido, responsabilidad por precios que la agencia carga (la IA solo cita precios con fuente y vigencia).

---

## 13. MVP de 6 semanas (fases)

**Semana 0 — decisiones** (§14): nombre, hotel piloto, modelo de precio del piloto, aprobación de contrato piloto (sin cobro).

| Fase | Semanas | Entregables | Criterio de salida |
|---|---|---|---|
| **1. Núcleo** | 1–2 | Repo nuevo (web + `desk-api`); modelo de tenants/placements/miembros; API interna CRT v1 (catalog, quote, availability, requests) con identidad de servicio; chat PWA por QR para **1 tenant**; agente con guardas; consentimiento. | Un huésped de prueba cotiza un tour CRT con precio real y crea una solicitud que llega al pipeline CRT. |
| **2. Hotel** | 3–4 | Panel del ejecutivo (bandeja, tomar conversación, modo Semi); base de conocimiento del hotel (PDF/texto, vigencia) con recuperación aislada; catálogo propio del hotel (solo con precio + fuente + vigencia); atribución por placement; métricas básicas. | Tests de aislamiento entre 2 tenants verdes; el hotel carga su información sin ayuda técnica. |
| **3. Piloto** | 5–6 | Modo kiosco; widget web embebible; reporte de comisiones; documentos legales (aviso, términos, contrato piloto); lanzamiento en el hotel piloto (QR en X habitaciones + tablet). | 2 semanas de operación real; medir sesiones, solicitudes, pagos, escalados, CSAT. |
| 4. Después | 7+ | WhatsApp por tenant; marca blanca completa para agencias; facturación de suscripciones; voz. | Según resultados del piloto. |

Equipo/costo: desarrollo propio; infraestructura dentro de capas gratuitas en piloto (**por validar**). Materiales físicos (QR impresos, tablet) los aporta el hotel o requieren aprobación de gasto.

---

## 14. Riesgos

| Riesgo | Mitigación |
|---|---|
| Fuga de datos entre tenants | `tenantId` del servidor; base separada; tests de contrato; recuperación filtrada antes del LLM. |
| La IA cita precio desactualizado de un tenant | Precio solo si tiene fuente y vigencia; si no, "lo cotizo". |
| Conflicto con el tour desk actual del hotel o sus operadores aliados | Posicionar como extensión 24/7; permitir catálogo propio del hotel; revenue share competitivo. |
| Baja adopción del huésped (QR ignorado) | Placements múltiples, mensaje pre-llegada, atribución para iterar. |
| Comisión del hotel erosiona margen CRT | Validar margen por proveedor antes de fijar el %; piloto con tope. |
| Requisitos de Meta para WhatsApp multi-cliente | Dejar WhatsApp para fase 4; validar estatus de proveedor tecnológico. |
| Responsabilidad legal por servicios de terceros | Contratos claros; pólizas de proveedores verificadas (ya en `operators`). |
| Estacionalidad (temporada verde) | Pricing híbrido sin cuota fija para el hotel en piloto. |
| Competidores con más funciones de app de huésped | Enfocarse en ventas conversacionales + operación local real, no en check-in/llaves. |

---

## 15. Decisiones que necesita el dueño

1. **Nombre** del producto: "Digital Desk", "Agent Desk" u otro (verificar disponibilidad de marca y dominio — **por validar**).
2. **Hotel piloto**: cuál (sugerencia: un boutique de 20–80 habitaciones en Pacífico Sur o Manuel Antonio con huésped internacional) y quién es el contacto.
3. **Modelo de precio del piloto**: recomendado **híbrido gratis + revenue share** sobre catálogo CRT; definir el % (referencia de mercado ≈15%) después de revisar el margen CRT por proveedor.
4. **Arquitectura**: aprobar repo nuevo + API interna CRT v1 (recomendado) y si la base de datos va en el mismo proyecto GCP (base Firestore separada) o en un proyecto nuevo.
5. **¿Quién cobra al huésped?** CRT (flujo de pago actual) para ítems CRT; para el catálogo propio del hotel en el piloto, solo solicitud (sin pago).
6. **Marca blanca para agencias**: ¿se ofrece el catálogo CRT dentro de la marca blanca o solo el catálogo de la agencia?
7. Revisión legal (Ley 8968, PRODHAB, ICT, contrato) antes del lanzamiento.
