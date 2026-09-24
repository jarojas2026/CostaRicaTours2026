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

---

# 20. Manual maestro para futuras inteligencias artificiales

Este README es el mapa operativo del proyecto. Una IA nueva debe leer todo el repositorio, no solamente este documento, antes de tocar código. Este documento describe intención y arquitectura; el código fuente es la autoridad final sobre comportamiento.

## 20.1 Principio de evolución

La plataforma es un sistema comercial vivo. La prioridad es evolucionar lo existente: descubrir, comprender, reutilizar, conectar, mejorar, verificar, medir y documentar.

No se debe sustituir un servicio funcional por una implementación paralela solo porque resulte más sencilla.

## 20.2 Clasificación de la información

- STABLE_KNOWLEDGE: conocimiento turístico relativamente estable.
- LIVE_VERIFIED: información comprobada mediante una fuente o servicio vivo.
- CUSTOMER_PROVIDED: dato proporcionado por el viajero.
- PROVIDER_PROVIDED: dato recibido del proveedor.
- AUTHORITATIVE_CATALOG: dato del catálogo comercial interno.
- UNVERIFIED: información que todavía no ha sido comprobada.

Una IA nunca debe convertir UNVERIFIED en LIVE_VERIFIED por inferencia.

## 20.3 Ciclo completo del viajero

El objetivo comercial es que un visitante pueda pasar de pregunta → descubrimiento → preferencias → planificación → catálogo → disponibilidad → proforma → solicitud → proveedor → confirmación → pago → voucher → operación → seguimiento → fidelización.

El Journey Orchestrator, backend/travelJourneyOrchestrator.ts, coordina la planificación sin sustituir el motor de reservas.

## 20.4 Memoria

La memoria existe para dar continuidad, no para inventar información.

Cuando exista sessionId, los agentes deben intentar recuperar contexto relevante antes de volver a preguntar lo mismo. Deben guardar únicamente información útil para el servicio y evitar datos sensibles innecesarios.

Colecciones principales: agent_memory, agent_memory_vectors y traveler_journeys.

## 20.5 Ventas asistidas por IA

Los agentes comerciales deben comportarse como asesores turísticos humanos de alta calidad: escuchar antes de vender, detectar intención, preguntar solo lo necesario, reconocer presupuesto/tiempo/ritmo, ofrecer alternativas, explicar incertidumbre, recordar decisiones, reducir fricción y facilitar formulario, proforma, WhatsApp o email.

El objetivo es reducir fricción, no simplemente aumentar mensajes.

## 20.6 Disponibilidad y reserva

backend/bookingService.ts es la autoridad para reservas y cupos.

Regla: recomendación ≠ disponibilidad ≠ reserva confirmada ≠ pago confirmado.

Nunca afirmar una confirmación sin evidencia correspondiente. La máquina de estados canónica está en backend/bookingStateMachine.ts y la idempotencia en backend/idempotencyService.ts.

## 20.7 Proveedores

Flujo esperado: cliente solicita → agente normaliza → se genera orden operacional → se envía al proveedor → proveedor responde → providerInboxAgent identifica remitente y orden → IA clasifica → transición con evidencia → actualización al cliente → evento auditado.

El correo del proveedor no es automáticamente confiable: debe existir proveedor conocido, identificador de orden y evidencia suficiente. Las respuestas ambiguas pasan a revisión.

## 20.8 Agente de correo

backend/providerInboxAgent.ts está preparado para Gmail OAuth. Variables esperadas: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN y GMAIL_INBOX_USER opcional.

El cron nativo revisa la bandeja cada minuto. Si las credenciales no existen, el agente permanece inactivo sin romper el resto del sistema.

## 20.9 Clima y adaptación

backend/weatherPulseService.ts proporciona contexto meteorológico vivo. El clima puede provocar aviso, cambio de horario, cambio de actividad, alternativa, escalamiento o adaptación del itinerario.

La IA no debe convertir una alerta meteorológica en cancelación automática salvo que exista una regla operativa explícita y una fuente autorizada.

## 20.10 Itinerario adaptativo

Un itinerario no es un documento estático. Debe poder cambiar cuando cambian disponibilidad, clima, vuelos, preferencias, viajeros, duración, actividad o restricciones operativas.

El viaje guardado en traveler_journeys representa el estado actual y debe conservar trazabilidad de las modificaciones relevantes.

## 20.11 Humanismo operacional

Detrás de cada reserva existe una persona. En retrasos, cancelaciones, pérdidas de conexión, frustración, cambios familiares, limitaciones de movilidad, problemas de equipaje, cambios de vuelo o errores del proveedor, la respuesta debe ser clara, empática y accionable.

El sistema no debe diagnosticar ni prometer resultados que no puede garantizar.

## 20.12 Centro de control administrativo

backend/adminControlCenterService.ts y src/pages/AdminControlCenterPage.tsx proporcionan la visión ejecutiva.

Debe permitir observar reservas, ventas, conversión, pendientes, cancelaciones/fallos, próximas 72 horas, alertas, proveedores, agentes, automatizaciones, bandeja de proveedores, memoria y viajes, evaluaciones de IA, skills, evolución y documentos operativos.

La información administrativa sensible requiere autenticación.

## 20.13 Automatización

La automatización comercial es nativa. Motor principal: backend/cronEngine.ts, backend/nativeAutomationEngine.ts y backend/nativeWorkflows.ts.

No introducir una dependencia externa de automatización cuando el proceso ya puede ejecutarse de forma segura dentro del backend.

Los procesos deben ser observables, idempotentes, auditables, recuperables, tolerantes a fallos y limitados por permisos.

## 20.14 Agentes y herramientas

Arquitectura esperada:

INTENT → CONTEXT / MEMORY → TOOL SELECTION → TOOL EXECUTION → OBSERVATION → REASONING → POLICY / SAFETY → CUSTOMER RESPONSE → OPERATIONAL EVENT → LEARNING

Las herramientas nuevas deben registrarse en backend/agentTools.ts y conectarse al ciclo real de function calling cuando corresponda.

## 20.15 Desarrollo seguro

Antes de modificar: revisar imports, tipos, rutas, Firestore, permisos, estados, efectos secundarios, tests/build y diff contra la rama base.

Después: ejecutar npm run lint, npm run build, revisar diff, logs, rutas nuevas, autenticación y confirmar que no se eliminaron líneas funcionales accidentalmente.

## 20.16 Qué significa no romper nada

Una mejora correcta conserva interfaces existentes cuando sea posible, mantiene rutas antiguas, no elimina agentes/workflows/colecciones, no cambia silenciosamente estados, no sustituye fuentes de verdad, añade capacidades incrementalmente, registra eventos y deja una ruta clara de rollback.

## 20.17 Fuentes de verdad

Prioridad: 1) estado transaccional de Firestore; 2) respuesta viva de proveedor o fuente autorizada; 3) catálogo oficial interno; 4) memoria del viajero; 5) conocimiento turístico estable; 6) inferencia de IA.

La inferencia nunca debe sobreescribir evidencia operacional.

## 20.18 Objetivo final del producto

Costa Rica Tours debe evolucionar hacia un mostrador digital autónomo de turismo: entiende al viajero, conserva contexto, diseña viajes, consulta datos vivos, busca experiencias, verifica disponibilidad, prepara proformas, coordina proveedores, procesa respuestas, informa al cliente, adapta el viaje, detecta problemas, escala cuando corresponde, registra cada paso, mide resultados y mejora sus agentes.

La autonomía siempre está subordinada a seguridad, trazabilidad, permisos y evidencia.

---

# AI Handoff Contract — Costa Rica Tours 2026

> **Purpose:** this section is the operational handoff document for any future human developer or AI agent working on the repository.

## A. Product truth

Costa Rica Tours 2026 is a **commercial tourism reservation platform**, not a generic chatbot. The success path is:

`visitor → conversation → traveler profile → trip design → catalog → live verification → quote/proforma → reservation request → provider coordination → confirmation → payment → voucher → operation → post-sale`.

The AI layer exists to reduce friction along this path while preserving human control and factual integrity.

## B. Source-of-truth hierarchy

Use the strongest available source and label the provenance:

1. **AUTHORITATIVE_CATALOG** — `src/data/toursData.ts`
2. **LIVE_VERIFIED** — live availability, weather, provider response or other verified operational source
3. **CUSTOMER_PROVIDED** — explicit traveler information
4. **PROVIDER_PROVIDED** — information received from an authorized provider
5. **STABLE_KNOWLEDGE** — expert tourism guidance that is not a live operational fact
6. **UNVERIFIED** — information that must not be presented as confirmed

Never turn an inference into a confirmation.

## C. Full journey orchestration

### `backend/travelJourneyOrchestrator.ts`

This is the integration layer for the complete trip lifecycle. It combines:

- traveler memory;
- tourism intelligence;
- catalog matching;
- real availability;
- live destination weather;
- route strategy;
- deterministic itinerary fallback;
- packing guidance;
- commercial stage;
- WhatsApp/email/web conversion paths.

Persistent journeys use Firestore collection `traveler_journeys`.

Public APIs:

- `POST /api/journey/build`
- `GET /api/journey/:journeyId`
- `POST /api/journey/:journeyId/adapt`

The commercial stage is one of:

- `DISCOVERY`
- `VERIFICATION`
- `READY_TO_QUOTE`
- `RECOVERY`

## D. Traveler memory

Memory is for continuity, not invention.

When a session identifier exists, retrieve relevant context before asking questions already answered. Store only information useful for the service. Do not expose internal memory or sensitive operational data to the traveler.

Primary services/collections:

- `backend/memoryService.ts`
- `backend/semanticMemoryService.ts`
- `agent_memory`
- `agent_memory_vectors`
- `traveler_journeys`

## E. Provider communication

### `backend/providerInboxAgent.ts`

Provider replies are processed through a controlled pipeline:

`provider email → authenticated/known sender → service-order ID → AI/deterministic classification → confidence gate → service-order transition → customer notification → audit event`.

Recognized outcomes:

- `confirm`
- `reject`
- `delay`
- `no_show`
- `complete`

Ambiguous responses remain for human review.

Required Gmail server credentials:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_INBOX_USER`

The native cron checks the inbox every minute. Missing Gmail credentials must disable this worker without breaking the rest of the application.

Internal manual sweep:

- `POST /api/internal/provider-inbox/sweep`
- protected by `AGENT_INTERNAL_TOKEN`

## F. Native automation

The project uses code-based automation:

- `backend/cronEngine.ts`
- `backend/nativeAutomationEngine.ts`
- `backend/nativeWorkflows.ts`

Do not introduce a second orchestration platform for workflows that already belong in the native engine.

Current automation includes booking lifecycle, holds, weather monitoring, concierge, pre-sale recovery, post-sale loyalty, provider operations and provider inbox polling.

## G. AI workforce

Core agents:

- Concierge
- Triage
- Booking
- Provider Liaison
- Operations
- Supervisor
- Learning

Extended capabilities include:

- itinerary planning;
- conversion advisory;
- multilingual support;
- sustainability;
- safety screening;
- payments;
- trip fit;
- packing;
- route strategy;
- destination intelligence;
- full journey construction/adaptation;
- live weather.

The agent architecture should remain **plurivalent but governed**: agents can understand multiple real-life scenarios, but they must delegate to the service that owns the authoritative fact.

## H. Human-centered sales behavior

The assistant should behave like a strong tourism advisor:

- listen before selling;
- remember decisions;
- reduce repetitive questions;
- recognize uncertainty;
- explain what is and is not confirmed;
- preserve traveler preferences after a rejection;
- offer alternatives;
- keep a human handoff available;
- use the appropriate channel: web form, proforma, WhatsApp or email.

A rejected supplier request is a recovery event, not the end of the customer relationship.

## I. Administrative command center

The owner-facing control center is:

- frontend: `src/pages/AdminControlCenterPage.tsx`
- backend: `backend/adminControlCenterService.ts`
- route: `/admin`
- API: `GET /api/admin/control-center`

It aggregates:

- bookings;
- confirmed/pending/failed operations;
- revenue;
- upcoming operations;
- alerts;
- agent identities;
- automation health;
- provider status;
- provider inbox events;
- journeys;
- memory/evaluation counts;
- skill evolution;
- AI evaluations.

Keep this dashboard based on real persisted/observed events. Do not manufacture business metrics to make the system appear healthier.

## J. Rules for future changes

Before modifying code:

1. Read this README.
2. Read the target service completely enough to understand its ownership.
3. Search for existing implementations before creating new ones.
4. Reuse domain services instead of duplicating business logic.
5. Preserve working behavior unless a change is explicitly required.
6. Do not remove existing functionality merely to simplify the code.
7. Do not add synthetic data that can be mistaken for real data.
8. Protect state-changing/internal endpoints.
9. Keep pricing server-authoritative.
10. Keep availability server-authoritative.
11. Preserve idempotency.
12. Preserve auditability and operational events.
13. Keep traveler memory minimal and purposeful.
14. Mark live versus stable versus unverified information.
15. Add tests/build verification for structural changes.
16. Compare the branch with its base before creating a PR.
17. Document every new architectural capability here.

## K. What “intelligent” means in this project

Intelligence is not merely a larger prompt or more model calls.

A capable tourism agent should be able to:

- understand incomplete requests;
- ask the smallest useful number of questions;
- remember answers;
- reason geographically;
- compare experiences;
- verify live constraints;
- adapt to weather;
- detect provider rejection;
- recover the itinerary;
- preserve budget/time preferences;
- create a commercial next step;
- explain uncertainty;
- escalate when authority or evidence is insufficient;
- record the outcome so the ecosystem can learn.

The system should continuously move from **answering questions** toward **managing the traveler journey**.

## L. Safety and governance

No agent may:

- claim a booking is confirmed without evidence;
- claim a payment is completed without server verification;
- guarantee wildlife sightings;
- override protected-area or operator safety rules;
- diagnose medical conditions;
- invent provider availability;
- expose secrets or private operational records;
- auto-modify production source code without a controlled human-approved development process.

Learning may propose improvements; production code changes remain controlled changes.

## M. Development invariant

**Connect before replacing. Reuse before duplicating. Verify before promising. Record before forgetting. Recover before abandoning.**

This invariant applies to every future AI, agent, workflow, feature and pull request in this repository.

---

# Evolución operativa 2026-09-24

Esta sección documenta la integración operativa realizada sobre la base existente. No reemplaza las secciones anteriores: las complementa.

## Viaje completo conectado

El flujo de Journey conserva la arquitectura existente de memoria, catálogo, clima, verificación de disponibilidad e itinerario. Una recomendación no equivale a disponibilidad, una disponibilidad verificada no equivale a una reserva y una reserva no equivale a un pago confirmado.

## Agente de bandeja de proveedores

`backend/providerInboxAgent.ts` procesa respuestas de proveedores mediante Gmail OAuth cuando las credenciales están configuradas. Cada mensaje debe corresponder a un remitente registrado y a una orden `OS-CR-*`. Las respuestas ambiguas pasan a revisión humana; no se inventan confirmaciones.

Acciones reconocidas con evidencia suficiente: confirmación, rechazo, demora, no-show y servicio completado. Los resultados se registran en `provider_inbox_events`, se conectan con `handleProviderAction()` y pueden notificar al viajero por email/WhatsApp según los canales configurados.

El cron nativo ejecuta este agente cada minuto. Si Gmail no está configurado, el agente permanece inactivo de forma segura.

## Centro de Control Ejecutivo

`backend/adminControlCenterService.ts` agrega únicamente datos operativos existentes: reservas, ventas confirmadas, pendientes, cancelaciones/rechazos, próximas 72 horas, alertas, proveedores, viajes, memoria, evaluaciones IA, skills, logs y estado del agente de correo.

`src/pages/AdminControlCenterPage.tsx` presenta esta información en `/admin` detrás de `AdminRouteGuard`. No deben utilizarse contadores demo ni ingresos sintéticos.

## Humanismo y ventas asistidas

La IA comercial debe escuchar el contexto, recordar decisiones útiles, reconocer incertidumbre, explicar el siguiente paso y conservar alternativas cuando un proveedor rechaza una solicitud. El sistema debe reducir fricción hacia formulario, proforma, WhatsApp, email o atención humana sin fabricar urgencia, cupos, precios o confirmaciones.

## Regla para futuras IAs

Antes de implementar una nueva capacidad, buscar primero si existe un servicio equivalente en el repositorio. Integrar sobre la fuente de verdad existente, mantener trazabilidad y estados, añadir pruebas/verificación y actualizar este README. Los cambios destructivos requieren autorización explícita.