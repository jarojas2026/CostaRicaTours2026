# 🇨🇷 Costa Rica Tours 2026 — AI Tourism Operating System

Plataforma full-stack de venta, asesoría, planificación y operación de servicios turísticos en Costa Rica.

> **Principio rector:** el sistema no debe limitarse a contestar preguntas. Debe entender al viajero, recordar su contexto, construir un viaje, verificar datos vivos, convertir una intención en una reserva y coordinar la operación con proveedores, manteniendo al humano informado cuando una decisión requiere supervisión.

---

## 1. Propósito del proyecto

Costa Rica Tours es una plataforma comercial de turismo con una arquitectura de agentes de IA, automatización nativa y servicios de dominio.

El producto debe funcionar como:

- catálogo comercial de tours y experiencias;
- asesor turístico conversacional;
- planificador de viajes multidía;
- asistente de ventas y recuperación de prospectos;
- sistema de disponibilidad y reservas;
- centro de comunicación con proveedores;
- sistema de notificación por email y WhatsApp;
- memoria operativa del viajero;
- motor de adaptación por clima y cambios operativos;
- mostrador digital full-stack;
- centro ejecutivo de control para el propietario/administrador;
- plataforma que puede seguir evolucionando mediante nuevos agentes y herramientas sin perder las reglas de negocio existentes.

---

## 2. Regla de oro para cualquier IA que modifique este repositorio

**NO EMPEZAR DE CERO.**

Antes de modificar algo:

1. leer el archivo completo;
2. identificar qué servicio ya resuelve el problema;
3. reutilizar funciones existentes;
4. revisar rutas, tipos, Firestore y estados relacionados;
5. preservar comportamiento útil;
6. hacer el cambio mínimo necesario;
7. verificar TypeScript/build/tests;
8. comparar contra la base antes de publicar;
9. no introducir datos sintéticos como si fueran reales;
10. no borrar arquitectura existente salvo autorización explícita.

### Prohibiciones operativas

- No inventar disponibilidad.
- No inventar confirmaciones de pago.
- No inventar respuestas de proveedores.
- No presentar conocimiento estático como información en vivo.
- No usar una tarifa CRC antigua como fuente de verdad.
- No reemplazar un servicio de dominio por lógica duplicada en otro agente.
- No eliminar workflows o agentes existentes para simplificar.
- No crear un segundo sistema de reservas paralelo.
- No exponer endpoints que producen efectos persistentes sin autenticación.
- No guardar secretos en el frontend.
- No asumir que una recomendación turística equivale a una reserva.

---

## 3. Stack actual

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Motion
- React Router
- Firebase Auth / Firestore
- PWA
- Leaflet / Google Maps
- componentes comerciales de tours, reservas, itinerarios, vuelos y asistencia IA

### Backend

- Node.js
- Express
- TypeScript
- Firebase Admin / Firestore
- Stripe
- PayPal
- Google GenAI
- Anthropic Vertex
- Google APIs
- Nodemailer
- Node Cron
- motor de automatización nativo

### Principio de automatización

La automatización de negocio se ejecuta en código del proyecto y Firestore. Los procesos deben ser observables, idempotentes, auditables y recuperables.

---

## 4. Arquitectura conceptual

\`\`\`
TRAVELER
   │
   ├── Web / Form / WhatsApp / Email
   │
   ▼
COUNTER DESK / CONCIERGE
   │
   ▼
INTENT + MEMORY + TOURISM INTELLIGENCE
   │
   ├── Traveler Memory
   ├── Catalog
   ├── Availability
   ├── Weather
   ├── Route Strategy
   ├── Safety Screening
   └── Sales Context
   │
   ▼
JOURNEY ORCHESTRATOR
   │
   ├── Itinerary
   ├── Alternatives
   ├── Proforma readiness
   ├── Booking channels
   └── Human handoff
   │
   ▼
BOOKING STATE MACHINE
   │
   ├── Payment
   ├── Soft hold
   ├── Provider dispatch
   └── Customer notification
   │
   ▼
PROVIDER NETWORK
   │
   ├── Email request
   ├── Provider response
   └── Provider Inbox Agent
   │
   ▼
CUSTOMER
   │
   ├── Email
   ├── WhatsApp
   └── User booking history
   │
   ▼
ADMIN CONTROL CENTER
   ├── Sales
   ├── Operations
   ├── Alerts
   ├── Providers
   ├── Agents
   ├── Automations
   ├── AI evaluations
   └── Operational documents
\`\`\`

---

## 5. Memoria del viajero

### Servicios

- \`backend/memoryService.ts\`
- \`backend/semanticMemoryService.ts\`

La memoria combina:

- hechos explícitos;
- preferencias;
- objetivos;
- decisiones;
- historial reciente;
- recuperación lexical;
- recuperación semántica mediante embeddings cuando Gemini está disponible.

Colecciones relevantes:

- \`agent_memory\`
- \`agent_memory_vectors\`
- \`traveler_journeys\`

La memoria no debe utilizarse para inventar datos. Su función es evitar preguntas repetidas y mantener continuidad.

### Ejemplos de memoria útil

- número de viajeros;
- tipo de viaje;
- preferencias de playa/fauna/aventura/relax;
- fecha;
- aeropuerto;
- restricciones voluntariamente declaradas;
- tour seleccionado;
- decisiones ya tomadas;
- cambios realizados al itinerario.

---

## 6. Inteligencia turística

### \`backend/tourismIntelligenceEngine.ts\`

Clasifica conocimiento en:

- \`STABLE_KNOWLEDGE\`
- información que exige verificación viva.

Reglas esenciales:

1. primero geografía y logística;
2. después actividades;
3. el mes nunca se interpreta de forma aislada;
4. clima, carreteras, parques, océano y proveedores vivos tienen prioridad sobre conocimiento estático;
5. fauna nunca se garantiza;
6. actividades de aventura requieren verificación;
7. reglas de áreas protegidas prevalecen;
8. viajes cortos no deben sobrecargarse de regiones;
9. toda recomendación termina con una acción comercial concreta.

---

## 7. Journey Orchestrator

### \`backend/travelJourneyOrchestrator.ts\`

Es la capa que convierte la conversación en un proceso de viaje completo.

Conecta:

- memoria del viajero;
- perfil;
- intereses;
- regiones;
- catálogo;
- disponibilidad;
- clima;
- estrategia de ruta;
- equipaje;
- itinerario;
- etapa de ventas;
- canales de reserva.

### Estados comerciales principales

- \`DISCOVERY\`
- \`VERIFICATION\`
- \`READY_TO_QUOTE\`
- \`RECOVERY\`

### Canales de conversión

- formulario web;
- proforma;
- WhatsApp;
- email;
- atención humana.

La salida del Journey Orchestrator debe indicar qué está confirmado, qué fue verificado y qué todavía requiere verificación.

---

## 8. Disponibilidad real

La disponibilidad de negocio debe provenir de los servicios existentes de reservas/Firestore.

Herramienta:

- \`check_availability\`

Servicio:

- \`checkTourAvailability()\`

Nunca escribir:

> "Sí hay cupo"

si no existe una verificación real.

Si no se puede consultar la disponibilidad:

> "No puedo verificar el cupo todavía"

y ofrecer la siguiente acción.

---

## 9. Clima vivo

### \`backend/weatherPulseService.ts\`

Usa Open-Meteo con caché y clasificación de fuente.

Regiones actualmente contempladas por el pulso meteorológico:

- San José;
- Caribe Sur;
- Manuel Antonio / Pacífico Central;
- Arenal;
- Guanacaste.

El clima debe utilizarse para:

- informar;
- adaptar itinerarios;
- alertar operaciones;
- sugerir alternativas;
- nunca para garantizar que una actividad se realizará.

---

## 10. Itinerarios

### Servicio existente

\`backend/itineraryService.ts\`

El sistema conserva el planificador existente y añade una capa de orquestación.

La regla es:

**el itinerario es una propuesta hasta que las condiciones operativas y la disponibilidad real estén verificadas.**

---

## 11. Catálogo comercial

Fuente principal:

- \`src/data/toursData.ts\`

Las IA deben consultar el catálogo mediante:

- \`search_tours\`
- \`compare_tours\`
- \`quote_price\`
- \`check_availability\`

No duplicar precios de tours dentro de prompts o agentes.

---

## 12. Function Calling y razonamiento operativo

### \`backend/agentTools.ts\`

El registro unificado incluye herramientas para:

- búsqueda de tours;
- disponibilidad;
- consulta de reservas;
- memoria;
- comparación;
- cotización;
- itinerario;
- WhatsApp;
- política de cancelación;
- temporada;
- ajuste de viaje;
- equipaje;
- seguridad;
- rutas;
- inteligencia de destino;
- construcción del viaje completo;
- adaptación de viajes;
- clima vivo.

### Flujo esperado

\`\`\`
Usuario
  ↓
Intent
  ↓
Selección de herramienta
  ↓
Ejecución real
  ↓
Observación
  ↓
Nuevo razonamiento
  ↓
Más herramientas si hace falta
  ↓
Respuesta final
\`\`\`

El bucle de herramientas está limitado para evitar ciclos infinitos.

---

## 13. Agentes

El ecosistema ya contempla agentes especializados y extensiones.

### Agentes principales

- Concierge
- Triage
- Booking
- Provider Liaison
- Operations
- Supervisor
- Learning

### Extensiones

- Itinerary Planner
- Conversion Advisor
- Multilingual Support
- Sustainability Guide
- Safety / Health
- Payments Support

### Principio de plurivalencia

Un agente puede comprender varios escenarios, pero debe delegar cuando otra inteligencia tiene autoridad o información más adecuada.

Ejemplo:

- Concierge entiende la intención.
- Booking verifica disponibilidad.
- Provider Liaison coordina al proveedor.
- Operations vigila el servicio.
- Supervisor audita contradicciones.
- Learning convierte resultados reales en conocimiento reutilizable.

---

## 14. Humanismo del sistema

El objetivo comercial no es presionar al viajero.

El asistente debe:

- escuchar;
- recordar;
- explicar;
- anticipar preocupaciones;
- reconocer incertidumbre;
- ofrecer alternativas;
- proteger el tiempo del viajero;
- explicar costos y estados;
- mantener lenguaje humano;
- evitar respuestas robóticas;
- no prometer lo que no está confirmado;
- mantener siempre una vía humana.

### Ejemplo de recuperación

Si un proveedor rechaza una solicitud:

1. explicar claramente el resultado;
2. no culpar al proveedor;
3. conservar las preferencias del viajero;
4. buscar otra fecha;
5. buscar otra experiencia;
6. proponer una ruta alternativa;
7. permitir contacto humano.

---

## 15. Ventas

La plataforma es un producto comercial.

Cada conversación debe detectar, cuando corresponda:

- intención de compra;
- fecha;
- viajeros;
- actividad;
- presupuesto;
- región;
- urgencia;
- canal preferido;
- nivel de decisión.

El agente debe conducir al siguiente paso sin inventar presión:

\`\`\`
Interés
 → Descubrimiento
 → Recomendación
 → Verificación
 → Cotización
 → Proforma
 → Reserva
 → Pago
 → Confirmación
 → Operación
 → Postventa
\`\`\`

---

## 16. Proveedores

### \`backend/providerCommunicationService.ts\`

El flujo objetivo es:

\`\`\`
Cliente solicita
   ↓
Reserva / Journey
   ↓
Orden de servicio
   ↓
Email al proveedor
   ↓
Proveedor responde
   ↓
Provider Inbox Agent
   ↓
Clasificación
   ├── confirm
   ├── reject
   ├── delay
   ├── no_show
   └── complete
   ↓
Actualización de orden + reserva
   ↓
Cliente informado
\`\`\`

Las órdenes se persisten en:

- \`service_orders\`

Esto permite recuperación después de reinicios del servidor.

---

## 17. Agente de correo de proveedores

### \`backend/providerInboxAgent.ts\`

El agente:

1. usa Gmail OAuth;
2. revisa mensajes no leídos;
3. valida remitente contra proveedores conocidos;
4. identifica el ID de orden \`OS-CR-...\`;
5. clasifica la respuesta;
6. exige un nivel mínimo de confianza;
7. ejecuta la transición;
8. notifica al cliente;
9. registra el evento;
10. deja casos ambiguos para revisión humana.

### Cron

\`backend/cronEngine.ts\`

El agente se ejecuta cada minuto.

Si Gmail no está configurado, permanece inactivo y no rompe los demás workflows.

### Variables necesarias

- \`GMAIL_CLIENT_ID\`
- \`GMAIL_CLIENT_SECRET\`
- \`GMAIL_REFRESH_TOKEN\`
- \`GMAIL_INBOX_USER\`

La autorización de Gmail debe mantenerse en el servidor. Nunca colocar el refresh token en React.

---

## 18. WhatsApp y email del cliente

### \`backend/notificationService.ts\`

Soporta canales configurados para:

- email;
- WhatsApp Cloud API;
- Twilio WhatsApp;
- webhook de gateway.

El sistema puede preparar enlaces de WhatsApp incluso cuando no existe un gateway automático.

---

## 19. Reservas y pagos

### Servicios

- \`backend/bookingService.ts\`
- \`backend/bookingStateMachine.ts\`
- \`backend/idempotencyService.ts\`

Reglas:

- el servidor calcula el total;
- el catálogo es la fuente del precio;
- el pago no se considera confirmado por una afirmación del usuario;
- las transiciones deben respetar la máquina de estados;
- los soft holds expiran automáticamente;
- las claves de idempotencia evitan duplicados.

---

## 20. Seguridad

### Autenticación

\`backend/authMiddleware.ts\`

Preferencia:

1. Firebase ID token;
2. claims \`admin\` / \`operator\`;
3. credencial servidor-a-servidor explícita cuando corresponda.

Las rutas sensibles deben estar protegidas.

### No exponer

- Firebase service accounts;
- refresh tokens;
- claves de Stripe;
- claves de PayPal;
- API keys de Gemini;
- credenciales SMTP;
- tokens de WhatsApp;
- claves internas de agentes.

---

## 21. Centro de Control Administrativo

### Backend

\`backend/adminControlCenterService.ts\`

### Frontend

\`src/pages/AdminControlCenterPage.tsx\`

Ruta:

\`/admin\`

Muestra:

- reservas;
- confirmaciones;
- pendientes;
- ventas;
- promedio por reserva;
- próximas operaciones;
- alertas;
- agentes;
- automatizaciones;
- Gmail provider agent;
- logs;
- proveedores;
- evaluaciones IA;
- skills;
- documentos operativos;
- viajes guardados;
- memorias;
- eventos de bandeja de proveedores.

El endpoint está protegido con \`requireAdmin\`.

---

## 22. Documentos operativos

Colecciones relevantes:

- \`bookings\`
- \`availability_slots\`
- \`service_orders\`
- \`traveler_journeys\`
- \`provider_inbox_events\`
- \`agent_memory\`
- \`agent_memory_vectors\`
- \`ai_evaluations\`
- \`admin_alerts\`

La administración debe permitir observar qué procesos realmente ocurrieron, no métricas sintéticas.

---

## 23. Evaluación y aprendizaje

Servicios existentes:

- \`backend/agentEvaluationService.ts\`
- \`backend/learningEngine.ts\`
- \`backend/learningPipelineService.ts\`
- \`backend/skillGenome.ts\`
- \`backend/skillEvolutionEngine.ts\`

Los agentes pueden evolucionar mediante evaluación, resultados y evidencia.

**No permitir auto-modificación de código en producción.**

La evolución debe ocurrir mediante:

1. observación;
2. evaluación;
3. propuesta;
4. validación;
5. cambio controlado;
6. pruebas;
7. despliegue.

---

## 24. Automatización nativa

El motor existente está en:

- \`backend/cronEngine.ts\`
- \`backend/nativeAutomationEngine.ts\`
- \`backend/nativeWorkflows.ts\)

Incluye procesos como:

- liberación de holds;
- vigilancia;
- recordatorios;
- clima;
- concierge;
- recuperación pre-venta;
- fidelización;
- pagos a proveedores;
- reportes;
- bandeja de proveedores.

Las nuevas funciones deben integrarse en este motor en lugar de crear un segundo motor de automatización.

---

## 25. APIs principales nuevas

### Construir viaje

\`POST /api/journey/build\`

Entrada típica:

\`\`\`json
{
  "sessionId": "traveler_x",
  "query": "familia, naturaleza y playa",
  "days": 7,
  "travelers": 4,
  "profile": "family",
  "arrivalAirport": "SJO",
  "date": "2026-12-10",
  "language": "es"
}
\`\`\`

### Leer viaje

\`GET /api/journey/:journeyId\`

### Adaptar viaje

\`POST /api/journey/:journeyId/adapt\`

### Centro administrativo

\`GET /api/admin/control-center\`

Requiere autenticación administrativa.

### Bandeja de proveedores

\`POST /api/internal/provider-inbox/sweep\`

Requiere \`AGENT_INTERNAL_TOKEN\`.

---

## 26. Interfaz comercial

La página principal mantiene:

- Hero comercial;
- navegación;
- categorías;
- destinos;
- tours;
- operadores;
- confianza;
- blog;
- contacto;
- WhatsApp;
- Smart Trip Advisor;
- Destination Pulse.

El Smart Trip Advisor ahora puede construir un viaje completo y llevar al usuario hacia el catálogo/reserva.

---

## 27. Reglas para datos de turismo

Clasificación recomendada:

### STABLE_KNOWLEDGE

Conocimiento relativamente estable.

### LIVE_VERIFIED

Dato obtenido mediante servicio vivo.

### CUSTOMER_PROVIDED

Dato entregado voluntariamente por el viajero.

### PROVIDER_PROVIDED

Dato recibido del operador.

### UNVERIFIED

Dato que no debe presentarse como confirmado.

Siempre conservar la procedencia cuando sea relevante.

---

## 28. Próximas evoluciones previstas

### Fase siguiente

- proforma automática conectada al Journey;
- adaptación automática del itinerario ante rechazo de proveedor;
- alternativas por clima;
- matching proveedor ↔ servicio;
- panel de cliente con timeline de viaje;
- historial completo de comunicaciones;
- estado de reserva visible en tiempo real;
- recuperación comercial inteligente;
- segmentación de prospectos;
- cotización multidía;
- vuelos, rent-a-car y buses como servicios coordinados;
- documentación descargable;
- auditoría de cada decisión de IA.

### Fase avanzada

- grafo de entidades viajero → viaje → reserva → proveedor → servicio;
- memoria de largo plazo controlada;
- agente supervisor de toda la operación;
- simulación previa de itinerario;
- detección de conflictos de agenda;
- planificación de contingencias;
- aprendizaje de resultados reales.

---

## 29. Checklist obligatorio para futuras IAs

Antes de hacer un PR:

- [ ] Revisé README.
- [ ] Revisé los servicios de dominio relacionados.
- [ ] Revisé las rutas existentes.
- [ ] Revisé el modelo de datos existente.
- [ ] No dupliqué lógica.
- [ ] No borré funcionalidades.
- [ ] No introduje datos sintéticos como reales.
- [ ] Protegí endpoints sensibles.
- [ ] Mantengo server-authoritative pricing.
- [ ] Mantengo disponibilidad real.
- [ ] Mantengo idempotencia.
- [ ] Mantengo trazabilidad.
- [ ] Mantengo memoria con privacidad mínima.
- [ ] Agregué fallback seguro.
- [ ] Verifiqué TypeScript.
- [ ] Verifiqué build.
- [ ] Comparé cambios contra la base.
- [ ] Documenté la nueva capacidad.

---

## 30. Filosofía de desarrollo

Este proyecto debe evolucionar como un sistema vivo.

Cada nueva IA que trabaje aquí debe preguntarse:

> ¿Qué existe ya?
>
> ¿Qué puedo conectar?
>
> ¿Qué evidencia real tengo?
>
> ¿Qué parte debe verificar otro servicio?
>
> ¿Qué necesita saber el viajero?
>
> ¿Cuál es el siguiente paso comercial?
>
> ¿Qué pasa si algo falla?
>
> ¿Cómo se recupera el viaje sin perder al cliente?
>
> ¿Cómo queda registrado para que otro agente pueda continuar?

El objetivo final no es tener muchos agentes aislados.

El objetivo es tener **un solo ecosistema inteligente**, donde cada agente entienda su responsabilidad, comparta contexto, consulte las mismas fuentes de verdad y ayude a llevar al viajero desde el primer mensaje hasta el final de su experiencia en Costa Rica.

---

## 31. Estado de la evolución documentada

La plataforma ya contiene una arquitectura avanzada de:

- agentes especializados;
- memoria semántica;
- herramientas con function calling;
- inteligencia turística;
- disponibilidad;
- clima;
- itinerarios;
- pagos;
- reservas;
- proveedores;
- automatización nativa;
- eventos;
- aprendizaje;
- evaluación;
- Counter Desk;
- Journey Orchestrator;
- Provider Inbox Agent;
- Executive Control Center.

Este README es parte de la arquitectura y debe actualizarse cada vez que una capacidad estructural nueva sea incorporada.
