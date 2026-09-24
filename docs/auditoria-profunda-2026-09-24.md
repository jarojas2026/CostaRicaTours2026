# Auditoría profunda de producción — 2026-09-24

## Alcance

Auditoría incremental sobre `main` de `CostaRicaTours2026`, preservando la arquitectura existente. Se revisaron especialmente:

- Function Calling y paridad registro/declaraciones/ejecutor.
- Customer Intake omnicanal, WhatsApp y memoria.
- Identidad del viajero y conflictos.
- Reservas, disponibilidad, pagos e idempotencia.
- Proveedores, despacho y failover.
- Autenticación de operaciones y rutas internas.
- Automatización nativa y eliminación de n8n.
- Tipo de cambio USD/CRC.
- Métricas y aprendizaje.
- Voice Agent Desk.
- Build/Vercel y deriva de ramas.

## Correcciones ejecutadas

### 1. Proveedores: cero asignaciones sintéticas
Los directorios estáticos heredados ya no se consideran fuente de verdad operativa. Un proveedor debe estar explícitamente marcado como verificado y activo para ser utilizado en despacho o failover.

- `backend/providerCommunicationService.ts`
- `backend/nativeWorkflows.ts`
- `backend/bookingService.ts`

Si no existe un proveedor verificable, el sistema escala a intervención humana en vez de inventar o seleccionar el primer registro disponible.

### 2. WhatsApp multimedia
Antes, audio/imagen/documento/video/sticker sin texto se descartaban silenciosamente.

Ahora:
- se conserva el evento;
- se crea un trabajo durable de Customer Intake;
- se registra el tipo de multimedia;
- se escala a revisión humana;
- no se afirma que la IA entendió el contenido.

### 3. Conflictos de identidad
Si teléfono y correo apuntan a identidades canónicas diferentes, Customer Intake no ejecuta acciones sensibles automáticamente y escala para verificación.

### 4. Contactos operativos
Se eliminó el número privado no configurado del código de emergencia/SINPE. Los contactos privados pasan por variables de entorno:

- `EMERGENCY_CONTACT_PHONE`
- `SINPE_MOBILE_NUMBER`

El 9-1-1 permanece como referencia pública de emergencia.

### 5. Auditoría automática
Se añadió:

`scripts/auditSystem.ts`

El auditor comprueba:
- paridad de herramientas AI: registro ↔ declaraciones ↔ ejecutores;
- duplicados de Function Calling;
- fallbacks sintéticos de proveedores;
- referencias n8n;
- metadatos heredados;
- contactos inseguros;
- variables críticas documentadas;
- necesidad de scheduler externo para la cola de Customer Intake.

El build ejecuta el auditor antes de Vite/esbuild.

## Pendientes que quedan identificados

### A. Vercel
El despliegue observado anteriormente utilizaba `feat/voice-fullstack-reservation-orchestration` en el commit `3d38016`, que estaba 14 commits detrás de `main`. Esa rama recibió una corrección sintáctica, pero la producción debe quedar apuntando al `main` actual.

### B. Cola serverless
El intervalo de 5 segundos sirve para procesos persistentes, pero Vercel/serverless no garantiza un proceso residente. Producción requiere un scheduler externo que invoque:

`POST /api/internal/customer-intake/process`

con `CUSTOMER_INTAKE_JOB_TOKEN`.

### C. Voice
La capa actual soporta recepción, STT vía proveedor de telefonía compatible, memoria, contexto y transferencia humana. Falta ampliar la ingesta nativa de audio/multimedia y pruebas end-to-end de proveedor telefónico en producción.

### D. Function Calling
La ruta Gemini ya ejecuta el ciclo:
intención → herramienta → observación → razonamiento → respuesta.

El auditor evita que el catálogo de herramientas vuelva a quedar desincronizado.

### E. Proveedores
La siguiente evolución debe poblar Firestore exclusivamente con proveedores reales, sus canales oficiales, estado de verificación, SLA, cobertura, seguros/licencias y condiciones de pago. No deben trasladarse datos estáticos heredados al entorno productivo como si fueran verificados.

### F. Aprendizaje
El Learning Pipeline ya genera datasets anonimizados y versionados. Falta cerrar el ciclo de evaluación → aprendizaje → propuesta de skill → aprobación → canary → promoción/rollback con métricas de producción suficientes.

### G. Datos en tiempo real
La arquitectura distingue conocimiento estable de disponibilidad/clima/operación en vivo. Falta ampliar la cobertura de fuentes verificadas para carretera, clima, parques y proveedores, con timestamps y caducidad por dato.

## Estado de seguridad operacional

El principio aplicado en esta auditoría es:

**si el sistema no puede verificar un hecho operativo, no debe convertirlo en una confirmación.**

Eso aplica a:
- cupos;
- pagos;
- identidad;
- proveedores;
- failover;
- multimedia;
- contactos;
- estado de reserva.
