# 📊 Estado Real del Ecosistema — Costa Rica Tours (Auditoría 2026)

Este documento detalla el estado técnico y operativo exacto de todos los componentes, endpoints, integraciones de n8n, motor de alertas y variables de entorno de la plataforma **Costa Rica Tours**.

---

## 1. Resumen Ejecutivo

La plataforma está construida sobre una arquitectura full-stack moderna y resiliente:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Motion.
- **Backend**: Servidor Express en `server.ts` con compilación CommonJS (`dist/server.cjs`) para producción y ejecución `tsx` en desarrollo.
- **Base de Datos & Seguridad**: Google Firebase / Firestore con reglas de acceso en `firestore.rules` (Default Deny para operaciones no autenticadas, permisos granulares para reservas y administradores).
- **Inteligencia Artificial**: Asistente inteligente y agentes especializados operados con Google Gemini 2.5 Flash en `backend/aiAssistantService.ts`, con integración opcional para Claude 3.5 Sonnet en Vertex AI (`backend/claudeService.ts`).
- **Automatización**: Modelo híbrido con **Motor Nativo en Node.js/Express** (`backend/nativeAutomationEngine.ts`, `backend/nativeWorkflows.ts`, `backend/cronEngine.ts`) y comunicación asíncrona hacia la instancia de **n8n** (`costaricatours2026.app.n8n.cloud`).

---

## 2. Mapa y Auditoría de Endpoints del Backend (`server.ts`)

| Endpoint | Método | Autenticación | Estado Real | Descripción y Lógica |
|---|---|---|---|---|
| `/api/health` | GET | Pública | ✅ Conectado | Estado del servidor, timestamp y verificación de uptime. |
| `/api/tours` | GET | Pública | ✅ Conectado | Catálogo oficial de tours y experiencias ecoturísticas en Costa Rica. |
| `/api/bookings` | GET | `requireOperator` (API Key) | ✅ Conectado | Consulta listado de reservas desde Firestore / memoria ordenadas por fecha. |
| `/api/bookings` | POST | Pública (con Rate Limit) | ✅ Conectado | Crea una reserva (soft hold o confirmada) en Firestore con cálculo de precios e IVA. |
| `/api/bookings/:id/status` | PATCH | `requireOperator` (API Key) | ✅ Conectado | Actualiza estado de reserva (`confirmada`, `cancelada`, `completada`, etc.). |
| `/api/alerts` | POST | `verifyN8NRequest` (`X-Webhook-Secret`) | ✅ Conectado | Endpoint propio para recibir alertas de n8n y guardarlas en `admin_alerts` (Firestore) + email SMTP. |
| `/api/alerts` | GET | `requireOperator` (API Key) | ✅ Conectado | Consulta alertas del sistema con filtros (`resolved`, `severity`), máx. 200. |
| `/api/alerts/:id` | PATCH | `requireOperator` (API Key) | ✅ Conectado | Marca alertas como leídas (`read`) o resueltas (`resolved`). |
| `/api/ai/chat` | POST | Pública | ✅ Conectado | Asistente de chat inteligente multilingüe con Gemini 2.5 Flash. |
| `/api/agent/tours/search` | POST | Pública | ✅ Conectado | Búsqueda filtrada de tours por precio, región, dificultad y duración. |
| `/api/agent/tools/check_calendar_availability` | POST | Pública | ✅ Conectado | Verificación de cupos disponibles y bloqueo de capacidad. |
| `/api/agent/tools/create_booking_and_notify` | POST | Pública | ✅ Conectado | Creación de reserva desde agente con despacho automático. |
| `/api/agent/tools/manifest` | GET | Pública | ✅ Conectado | Manifiesto JSON de herramientas y capacidades para agentes ReAct. |
| `/api/agent/tools/verify_sinpe_payment` | POST | Pública | ✅ Conectado | Verificación de comprobantes de pago bancario SINPE Móvil. |
| `/api/webhooks/n8n/booking-action` | POST | `verifyN8NRequest` (`X-Webhook-Secret`) | ✅ Conectado | Acciones de reserva enviadas por n8n (`confirm`, `cancel`, `reschedule`). |
| `/api/webhooks/n8n/update-booking` | POST | `verifyN8NRequest` (`X-Webhook-Secret`) | ✅ Conectado | Actualización directa de datos de reserva desde workflows. |
| `/api/webhooks/n8n/antifraud-score` | POST | `verifyN8NRequest` (`X-Webhook-Secret`) | ✅ Conectado | Recepción de evaluación antifraude y actualización en base de datos. |
| `/webhook/chat-inquiry` | POST | `verifyN8NRequest` | ✅ Conectado | Ejecuta `executeChatInquiry` con Gemini 2.5 Flash o fallback. |
| `/webhook/inicio-reserva` | POST | `verifyN8NRequest` | ✅ Conectado | Ejecuta `executeInicioReserva` (disponibilidad y creación). |
| `/webhook/solicitud-pago` | POST | `verifyN8NRequest` | ✅ Conectado | Ejecuta `executeSolicitudPago` (generación HMAC y links de pago). |
| `/webhook/reserva-confirmada` | POST | `verifyN8NRequest` | ✅ Conectado | Ejecuta `executeConfirmacionReserva` (generación QR y confirmación). |
| `/webhook/solicitud-itinerario` | POST | `verifyN8NRequest` | ✅ Conectado | Ejecuta `executeSolicitudItinerario` (matriz de tránsito y planificador). |
| `/webhook/solicitud-soporte` | POST | `verifyN8NRequest` | ✅ Conectado | Ejecuta `executeSolicitudSoporte` (ticket de soporte). |
| `/webhook/notificar-proveedor` | POST | `verifyN8NRequest` | ✅ Conectado | Ejecuta `executeNotificarProveedor` (despacho a operador). |
| `/webhook/evaluar-antifraude` | POST | `verifyN8NRequest` | ✅ Conectado | Ejecuta `executeEvaluarAntifraude` (cálculo de score IP/velocidad). |
| `/webhook/telegram-ops-action` | POST | `verifyN8NRequest` | ✅ Conectado | Procesa acciones operativas en Telegram. |
| `/webhook/sync-google-calendar` | POST | `verifyN8NRequest` | ✅ Conectado | Sincronización con Google Calendar API (si credenciales existen). |
| `/webhook/post-tour-nps` | POST | `verifyN8NRequest` | ✅ Conectado | Generación de token y encuesta de satisfacción post-tour. |
| `/webhook/reporte-semanal-conversion` | POST | `verifyN8NRequest` | ✅ Conectado | Agrega métricas semanales de conversión desde Firestore. |
| `/webhook/autonomous-multi-day-planner` | POST | `verifyN8NRequest` | ✅ Conectado | Generador de itinerarios multi-día con validación SINAC. |
| `/webhook/dynamic-pricing-yield-optimizer` | POST | `verifyN8NRequest` | ✅ Conectado | Optimizador de precios dinámicos según estacionalidad y demanda. |
| `/webhook/emergency-contingency-rerouting` | POST | `verifyN8NRequest` | ✅ Conectado | Matriz de re-enrutamiento por contingencias climáticas (CNE/IMN). |
| `/webhook/dgt-electronic-invoicing-settlement` | POST | `verifyN8NRequest` | ✅ Conectado | Generación de XML de factura electrónica DGT y liquidación a operadores. |
| `/webhook/autonomous-flight-guard-dispatch` | POST | `verifyN8NRequest` | ✅ Conectado | Simulador de monitoreo de retrasos de vuelos y reprogramación. |
| `/webhook/autonomous-crisis-sentiment-escalation` | POST | `verifyN8NRequest` | ✅ Conectado | Análisis de sentimiento y escalamiento de quejas críticas. |
| `/webhook/additionalWebhooks` (WF-14 a WF-24) | POST | `verifyN8NRequest` | ⚠️ Genérico | Manejador genérico `executeGenericAutomation` que registra logs y responde éxito. |

---

## 3. Estado de Automatizaciones y Workflows de n8n

### Workflows con Implementación Nativa Completa en Backend
- **WF-01** (Chat e Inteligencia Turística): Conectado con Gemini 2.5 Flash en `backend/aiAssistantService.ts`.
- **WF-02** (Inicio de Reserva & Soft Holds): Conectado con Firestore en `backend/bookingService.ts`.
- **WF-03** (Solicitud de Pago & Firma Criptográfica): Conectado con firmas HMAC-SHA256 y pasarelas Stripe/PayPal.
- **WF-04** (Confirmación de Reserva & Emisión de QR): Conectado con generador de códigos QR y actualización en base de datos.
- **WF-05** (Planificador de Itinerarios): Conectado con motor de itinerarios en `backend/itineraryService.ts`.
- **WF-06** (Notificación a Proveedores Locales): Conectado con registro maestro de operadores en `backend/nativeWorkflows.ts`.
- **WF-07** (Evaluación Antifraude): Conectado con validación de score por IP, país y velocidad de compra.
- **WF-08** (Soporte al Viajero & Tickets): Conectado con sistema de tickets.
- **WF-09** (Bot Operativo de Telegram): Conectado con `backend/notificationService.ts`.
- **WF-10** (Sincronización con Google Calendar): Conectado con integración de Calendar.
- **WF-11** (Encuestas NPS Post-Tour): Conectado con generador de tokens.
- **WF-12** (Reporte Semanal de Conversión): Conectado con cálculo analítico de reservas en Firestore.
- **WF-13** (Verificación de SINPE Móvil): Conectado con validador de comprobantes en `backend/sinpeService.ts`.

### Tareas Programadas (Cron Engine)
El archivo `backend/cronEngine.ts` ejecuta de forma programada con zona horaria `America/Costa_Rica`:
- `06:00 AM`: Liquidación automática a proveedores (`executeAutomatedProviderPayouts`).
- `07:00 AM`: Recordatorios 24 horas antes del tour (`executeTour24hReminders`).
- `Cada 2 horas`: Vigilancia y escalamiento de reservas pendientes (`executeSurveillanceAndEscalation`).
- `05:00 PM`: Solicitud de reseñas post-tour (`executePostTourReviewRequests`).
- `08:00 PM`: Reporte diario de operaciones (`executeDailyOperationReport`).
- `Cada 5 minutos`: Limpieza y liberación de soft holds expirados (`cleanupExpiredSoftHolds`).

---

## 4. Sistema Propio de Alertas Administrativas (Reemplazo de Telegram)

- **Colección Firestore**: `admin_alerts`.
- **Reglas de Seguridad**: Solo lectura y escritura para usuarios administradores autenticados (`firestore.rules`).
- **Notificación Complementaria**: Envío de correo electrónico vía SMTP (`nodemailer`) hacia `ADMIN_ALERT_EMAIL`.
- **Panel Administrativo**: Integrado en el componente `src/components/AdminDashboard.tsx` con subcomponente modular `src/components/AlertsCenter.tsx`.
- **Funcionalidades del Panel**:
  - Filtros por severidad (🔴 Crítica, 🟡 Advertencia, 🔵 Información).
  - Filtro para mostrar solo alertas no resueltas (activo por defecto).
  - Marcado rápido de alertas como "Vista" (`read`) y "Resuelta" (`resolved`).
  - Contador en tiempo real de alertas críticas sin resolver en la barra de navegación del dashboard.
  - Actualización automática por sondeo periódico cada 60 segundos.

---

## 5. Auditoría de Variables de Entorno (`.env.example`)

Todas las variables de entorno utilizadas en el proyecto han sido organizadas y documentadas en `.env.example`:

1. **Variables Esenciales de Backend**:
   - `GEMINI_API_KEY`: Motor de IA.
   - `FIREBASE_SERVICE_ACCOUNT` y `FIRESTORE_DATABASE_ID`: Persistencia y reglas de base de datos.
   - `OPERATOR_API_KEY`: Autenticación del personal en endpoints administrativos.
   - `N8N_WEBHOOK_SECRET` / `WEBHOOK_SECRET`: Firma de autenticación entre backend y n8n.
   - `PAYMENT_HMAC_SECRET`: Seguridad de enlaces y tokens de pago.
   - `ADMIN_ALERT_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Sistema de alertas administrativas por email.

2. **Variables de Pasarelas de Pago**:
   - `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_MODE`.

3. **Variables de Frontend (Públicas)**:
   - `VITE_GOOGLE_MAPS_API_KEY`: Mapas interactivos.
   - `VITE_STRIPE_PUBLIC_KEY`: Elementos de pago en frontend.

4. **Variables Opcionales / Fallbacks**:
   - `RESEND_API_KEY`, `SENDGRID_API_KEY`, `EMAIL_FROM`: Proveedores alternativos de correo.
   - `ANTHROPIC_VERTEX_*`, `GCP_PROJECT`: Opcionales si se activa Claude en Google Cloud Vertex AI.

---

## 6. Estado del Módulo `autonomousEngine.ts`

- **Diagnóstico**: El archivo contiene interfaces y contadores preliminares de simulación (`totalAutomatedActions`, `driversAutoAssigned`, etc.).
- **Etiquetado de Seguridad**: Se agregó el banner de advertencia obligatorio en la cabecera del archivo:
  `// ⚠️ DATOS DE DEMOSTRACIÓN — estos contadores NO reflejan actividad real todavía.`
- **Recomendación para el Negocio**:
  - *Opción A (Recomendada)*: Eliminar este archivo si la analítica de métricas se calcula directamente desde las reservas reales en Firestore.
  - *Opción B*: Conectar estos contadores a una colección de Firestore para auditoría real de choferes asignados cuando el subsistema de transporte se integre completamente.

---

## 7. Limpieza de Artefactos y Verificación

1. **Scripts Temporales Eliminados**: Se eliminaron 27 archivos `.cjs`, `.js` y `.txt` temporales de correcciones anteriores que ya no eran requeridos.
2. **Archivos de Bloqueo**: Se confirmaron `bun.lock` y `package-lock.json` presentes e intactos.
3. **Linter & Compilación**:
   - `npm run lint` (`tsc --noEmit`): **0 errores** ✅.
   - `npm run build` (`vite build` + `esbuild server.ts`): **0 errores** ✅.
