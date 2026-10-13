# 🇨🇷 Costa Rica Tours 2026 — AI Tourism Operating System

Plataforma full-stack de venta, asesoría, planificación y operación de servicios turísticos en Costa Rica.

Portal de proveedores: las respuestas se presentan exitosas solo tras guardar el pedido y se distinguen de la notificación al viajero y de la liquidación financiera. Ver alcance vigente en [`docs/estado-real-del-sistema.md`](docs/estado-real-del-sistema.md).

Actualización incremental del Agent Desk (1 de octubre de 2026): consultas WhatsApp unificadas con grupo y recogida, estados operativos desconocidos diferenciados de cero, errores de acceso visibles y consultas con tiempo límite sin reintentos automáticos. Ver alcance y pendientes reales en [`docs/estado-real-del-sistema.md`](docs/estado-real-del-sistema.md). Estos controles no equivalen a una reserva confirmada ni activan telefonía.

### Ruta de despliegue y fuente de verdad

`main` en `jarojas2026/CostaRicaTours2026` es la fuente de código. La ruta de producción propuesta es: GitHub Actions compila y despliega el backend privado `costa-rica-tours` en Cloud Run (`gen-lang-client-0782739149`, `us-central1`); Vercel publica el frontend y su puerta `/api` llama a ese servicio mediante `CLOUD_RUN_BACKEND_URL` y WIF. La sincronización con Google AI Studio sirve para editar y revisar código, pero su botón de despliegue crea un servicio paralelo (`costaricatours2026` en `us-west2`, fallido en la captura del 28 de septiembre de 2026). No volver a usar ese despliegue como producción mientras se consolida la ruta canónica.

La URL de Vercel sigue siendo la referencia pública provisional. El propietario ha mencionado `CostaRicaTours.ia`, `costaricatours.ai` y `CostaTours.io`; ninguno está comprado ni elegido como dominio definitivo. `.ia` no figura entre las extensiones delegadas por IANA; confirmar la grafía `.ai` antes de buscar o comprar. No cambiar enlaces de contacto, documentos, metadatos ni DNS hasta verificar propiedad del dominio, correo, HTTPS y flujo completo. Véase [`docs/despliegues-canonicos.md`](docs/despliegues-canonicos.md) para inventario, comprobaciones y migración sin interrumpir reservas.

La revisión de producción y el trabajo incremental del Agent Desk están registrados en [`docs/auditoria-consolidacion-2026-09-30.md`](docs/auditoria-consolidacion-2026-09-30.md). La guía operativa de voz está en [`docs/portable-voice-agent-desk.md`](docs/portable-voice-agent-desk.md).

Recuperación de voz (1 de octubre de 2026): los errores técnicos en la entrada y respuesta generan instrucciones de voz con captura de nuevas instrucciones, no una repetición automática de reservas/pagos. Se permiten como máximo dos recuperaciones consecutivas antes de ofrecer contacto web/WhatsApp y cerrar. La tecla 0 se anuncia solo cuando existe destino humano configurado; indicar «una persona» dentro del tamaño del grupo no solicita una transferencia. Esto no activa telefonía ni prueba una llamada real.

Decisiones y pendientes de conversaciones anteriores: conservar los agentes, servicios y reservas existentes; usar Web/WhatsApp/Voz/Email/Counter Desk como entradas al mismo ciclo de Concierge; exigir datos vivos para disponibilidad, pagos y proveedores. **Comprobación HTTP del 1 de octubre de 2026:** `/api/health` y `/api/tours` del sitio público Vercel respondieron 200. Esto reemplaza como observación de conectividad el 503 del 30 de septiembre, pero no demuestra reservas, pagos ni telefonía operativos. No hacer público Cloud Run para sortear problemas del gateway. Persisten la verificación operativa del scheduler externo, pruebas E2E autenticadas, configuración real de telefonía, OAuth Gmail/Outlook e imágenes verificadas del catálogo. La auditoría anterior del recorrido viajero está en [`docs/auditoria-consolidacion-2026-09-30.md`](docs/auditoria-consolidacion-2026-09-30.md). Integrar a `main` solo con checks verdes.

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
- Agent Desk de voz portable para hoteles/PBX, con memoria por llamada y transferencia humana cuando esté configurada ([operación y límites](docs/portable-voice-agent-desk.md));
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

## 11.1 Infraestructura visual de tours

La presentación fotográfica es parte del catálogo y de la infraestructura de producto, no un elemento decorativo aislado.

Servicios:

- `backend/tourMediaService.ts`
- `GET /api/tours/:id/media`
- herramienta IA `get_tour_media`

Cada tour puede exponer:

- imagen hero;
- galería;
- texto alternativo;
- etiquetas visuales de actividad y destino;
- posición/focal point cuando se incorpore;
- procedencia del asset (`curated`, `provider`, `customer`);
- reglas para evitar imágenes genéricas o repetidas.

Principio visual:

```
TOUR
 ↓
ACTIVIDAD REAL
 ↓
DESTINO / CONTEXTO
 ↓
GALERÍA DE EXPERIENCIA
```

La referencia visual de operadores turísticos como Alsama Tours y Expediciones Tropicales sirve para estudiar cómo una experiencia se presenta mediante fotografías específicas, actividades y destino; no se deben copiar sus imágenes ni contenido propietario. La plataforma mantiene sus propios assets y metadatos.

Esta capa permite posteriormente incorporar fotografías verificadas por proveedores, moderación de imágenes, almacenamiento CDN, focal points, versiones responsive y selección automática de fotografías por el agente de ventas sin cambiar el modelo comercial de tours.

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

---

## 32. Provider trust and autonomous recovery invariant

This checkpoint documents the current production-oriented invariant for the autonomous sales and provider workflow.

### Traveler journey
The customer-facing journey is coordinated by `backend/travelJourneyOrchestrator.ts` and exposed through the existing journey API. It reuses the authoritative tour catalog, traveler memory, live weather, journey availability verification, itinerary logic and commercial next-step state. The frontend entry point `src/components/SmartTripAdvisor.tsx` now delegates to the shared `FullTripJourneyBuilder` instead of maintaining a second planning implementation.

### Provider dispatch
`backend/providerCommunicationService.ts` must never silently select an unrelated provider when the requested tour has no matching active provider. Provider failover is valid only when the alternate provider explicitly advertises the same `tourId`. If no compatible provider exists, the service order remains rejected and an operational alert is created for human intervention.

### Provider email trust
Operational provider email destinations are configuration-driven. Use `PROVIDER_EMAILS_JSON` and/or explicitly configured provider email values. Do not treat an unverified hard-coded `officialEmail` value as sufficient evidence that a mailbox is operational. The provider inbox agent applies the same trust rule when accepting inbound messages.

### Provider inbox
`backend/providerInboxAgent.ts` checks the Gmail inbox every minute through the native cron engine. A message must come from a configured provider address and contain a recognizable `OS-CR-...` service-order identifier before it can affect an order. AI classification is confidence-gated; ambiguous messages remain in human review.

### Commercial humanism
The platform is designed to recover a customer's objective after operational failures. Rejection, delay, weather disruption or unavailable inventory should preserve traveler preferences and produce a concrete next step rather than a dead-end error.

### Administrative truth
The administrative control center must report persisted/observed events, not synthetic activity. Journey stages, provider inbox events, automation logs, alerts and AI evaluations should remain traceable to their source records.

### Future AI handoff
Any future agent must first search the repository for an existing capability, then connect to the existing source of truth. Do not create parallel reservation, catalog, memory, provider or automation systems when the corresponding service already exists.


---

## 33. Ciudad digital nacional — visión y contrato de implementación (2026-10-11)

**Documento maestro incremental:** [Ecosistema nacional, inscripciones, oficinas virtuales y plan operativo](docs/ciudad-digital-ecosistema-nacional-2026.md). Complementa, sin reemplazar, [arquitectura inicial de ciudad digital](docs/arquitectura-ciudad-digital.md) y [AGENTS.md](AGENTS.md).

Costa Rica Tours busca conectar **toda la oferta legítima de Costa Rica**: personas, trabajadores independientes, microempresas, turismo rural, comunidades, asociaciones, cooperativas, empresas, instituciones, espacios privados/públicos, eventos, parques y servicios especializados. Es una visión progresiva, **no una afirmación de que esos registros, cobros o integraciones ya están disponibles**.

### Registro universal y confianza

- Separar `Person`, `Organization`, `Membership`, `Place`, `Service`, `Event`, `Verification` y `Policy` como conceptos, reutilizando colecciones existentes. El frontend no debe establecer privilegios de organización por sí mismo.
- Una persona puede representar múltiples organizaciones con roles y permisos independientes, concedidos por el backend.
- Ficha informativa, entidad verificada y servicio reservable son estados diferentes. No habilitar cobros, inventario o alianzas oficiales sin contratos, autorización, evidencia y estado válido.
- Los datos de parques, entidades públicas, espacios privados, comunidades y personas tienen límites legales, de consentimiento, propiedad intelectual y operatividad. No suplantar organismos ni asumir autorización de venta.
- Moderación, documentación, derecho de rectificación, acceso y privacidad antes de habilitar inscripción pública masiva.
- Nuevas verticales reutilizan `bookingService`, `commerceCatalog`, `paymentWebhookService`, `providerPortalService`, `agentTools` y `travelJourneyOrchestrator`, nunca sus propios motores incompatibles.

### Oficina virtual de agentes, dentro del administrador

Primera versión (rama de trabajo, sujeta a CI): `src/components/AgentOfficeMap.tsx` se integra en `src/pages/AdminControlCenterPage.tsx`. El servidor añade `agentOffice` al snapshot del endpoint administrativo **ya autenticado** `/api/admin/control-center` mediante `backend/agentOfficeProjection.ts`. No se crea endpoint público.

- Distribución visual por equipos y agente seleccionable; funciona con los agentes registrados en `AGENT_IDENTITIES`.
- Fuente: lectura limitada de `agent_events`; muestra **actividad observada** (5 min), **sin señal reciente** o **telemetría no disponible**.
- No expone eventos originales, texto de clientes, payloads, secretos ni conversaciones.
- No finge `trabajando`, `en reposo`, tarea en curso ni controles ejecutables. Esos datos requieren una siguiente fase con `executionId`, tarea, inicio, fin, heartbeat, manejo de eventos obsoletos y auditoría.
- Los botones del plano solo inspeccionan. Acciones administrativas futuras deben pasar autenticación, autorización por operación y aprobación humana cuando corresponda.

### Orden de crecimiento y verificación

1. **Seguridad:** credenciales rotadas/gestionadas con identidad sin claves, permisos mínimos y auditoría de accesos.
2. **Comercio base:** pruebas completas de reserva, proveedor, pago/webhook, reintentos, disponibilidad, reembolso y conciliación en sandbox.
3. **Observabilidad:** tareas y eventos de agentes verificables, tracing, alarmas y recuperación operativa.
4. **Registro universal:** perfil, organización, membresías, representación y revisión.
5. **Territorio y servicios:** geografía, directorio, búsqueda, eventos y nuevas verticales con procedencia.
6. **Escala:** carga medida, paginación, caching, cola/outbox según necesidad real, costes y SLO.

### Investigación tecnológica

Se revisaron fuentes oficiales de OpenAI Agents SDK, Google ADK, LangGraph, Temporal, OpenTelemetry, React Flow, Kimi, DeepSeek, Qwen y Google Workload Identity Federation. Son **candidatos para evaluación**; no se afirman instalados ni gratuitos. Ningún framework debe reemplazar el motor nativo sin necesidad medida. Ver enlaces y criterios en el documento maestro.

**Regla invariable:** no rehacer la plataforma ni perder funciones, nunca fingir reservas/servicios/actividad de agentes, proteger los datos personales y públicos, probar cada cambio, pasar CI, revisar el diff y desplegar controladamente.


---

## 34. Ciudad digital internacional y Agent Skills (2026-10-11)

**Estado real:** primer módulo de preparación de inscripción en rama de desarrollo, no marketplace internacional lanzado.

- Arquitectura detallada: [Ciudad digital internacional y Skills](docs/ciudad-digital-global-skills-2026.md). Continúa [la ciudad digital de Costa Rica](docs/ciudad-digital-ecosistema-nacional-2026.md) y las reglas de [AGENTS.md](AGENTS.md).
- Preflight administrativo bilingüe: `src/components/DigitalCityRegistrationPreflight.tsx`, integrado en el administrador actual, llama al endpoint protegido `POST /api/admin/digital-city/registration/preflight`.
- Política tipada de preinscripción `backend/digitalCityRegistrationPolicy.ts`: distingue personas, freelance, microempresas, empresas, comunidades, asociaciones, instituciones, espacios públicos/privados y organizadores; valida país, localidad, consentimiento, representación y fuente.
- **No crea perfiles ni publica contenido**: incluso si una propuesta es apta para moderación, no puede reservarse, publicarse ni cobrar. Requiere construir inscripción autenticada, permisos por organización, verificación y obligaciones locales antes de activar operaciones.
- Nueva skill estandarizada: [`.agents/skills/global-city-onboarding/SKILL.md`](.agents/skills/global-city-onboarding/SKILL.md). Usa el formato Agent Skills con activación bajo demanda; no implica haber conectado modelos nuevos ni otorgado permisos adicionales a IA.
- GitHub: no fusionar a la fuerza PRs de Dependabot #151, #152, #154–#157 si GitHub informa conflictos o desactualización frente a `main`. Deben reconciliarse y pasar CI actual.
- **Riesgo operativo P0 detectado:** ver issue [#175](https://github.com/jarojas2026/CostaRicaTours2026/issues/175) sobre reportar un hold exitoso cuando el registro canónico pudo fallar. No anunciarlo solucionado hasta corregir y probar el flujo.
- **Seguridad:** una clave de cuenta de servicio compartida externamente necesita revocación/rotación; usar federación de identidades sin claves en CI/CD.

Se mantienen íntegros el catálogo y reserva única, motor nativo, memoria, Agent Desk, autenticación, Firestore, Stripe/PayPal y reglas de no inventar fuentes. Expandir al mundo exige jurisdicción y proveedores verificables, no registros sintéticos.


---

## 35. Solicitudes privadas de ciudad digital (2026-10-11)

**Documentación funcional:** [Fase 2: solicitudes privadas y revisión](docs/ciudad-digital-solicitudes-privadas-2026.md).

- `/participar`: formulario público bilingüe, requiere Google/Firebase ID token y correo verificado; el acceso de esta página no pide permisos Gmail ni Calendar.
- API `/api/digital-city/applications`: expediente privado idempotente, validado por `digitalCityRegistrationPolicy`, 3 solicitudes nuevas por cuenta y día con cuota transaccional, sin activar perfiles comerciales.
- `/api/digital-city/applications/mine`: únicamente expedientes de la persona autenticada.
- `/api/digital-city/applications/admin/queue` y `/admin/:id/triage`: seguimiento exclusivo del administrador, auditoría de revisión; no puede publicar/activar desde este flujo.
- Colecciones nuevas de solicitudes, cuotas y auditoría bajo Firestore Default Deny para clientes. No alterar `operators`, `proveedores`, `tours`, `bookings` o `payments`.
- **Pendiente:** políticas legales de privacidad/retención/corrección, reenvío de expedientes incompletos, validación documental, pruebas con Emulator, publicación revisada, membresías y comercialización. Una solicitud recibida NO significa negocio aprobado, ni proveedor asociado, ni cupos disponibles.


---

## 36. Corrección y retiro de solicitudes privadas de la ciudad digital (2026-10-11)

Fase 2B, sobre la inscripción implementada en [`/participar`](src/pages/DigitalCityJoinPage.tsx):

- El solicitante autenticado puede **corregir y reenviar** un expediente si el administrador lo marcó `needs_information`, conservando identificador y fecha de creación. El backend vuelve a verificar consentimiento, país y representación declarada; no permite modificar el tipo ni el país del expediente ya abierto.
- El solicitante puede **retirar** un expediente. El backend borra sus campos descriptivos del registro principal, marca `withdrawn` y bloquea publicaciones y transacciones. **No es supresión legal completa**: conserva UID, categoría, país, marcas temporales y una auditoría mínima, pendientes de política de retención.
- Ambos flujos requieren **Firebase ID token con email verificado**, son transaccionales en Firestore, comprueban la propiedad del expediente y el número de revisión esperado contra cambios simultáneos.
- La oficina administrativa mantiene únicamente `under_review`, `needs_information` y `rejected`; **ninguna transición habilita ventas** o crea un proveedor comercial.
- La implementación y sus límites se describen en [docs/ciudad-digital-solicitudes-privadas-2026.md](docs/ciudad-digital-solicitudes-privadas-2026.md). No se ha certificado aún el ciclo E2E con Firestore Emulator ni la revisión legal de privacidad, conservación y supresión.

**Regla:** no confundir retiro con eliminación completa de datos ni preinscripción con entidad publicada o reservable.


---

## 37. Plano arquitectónico de la ciudad digital (2026-10-11)

**Documento arquitectónico:** [Plano, distritos, accesibilidad y fases](docs/plano-arquitectonico-ciudad-digital-2026.md).

- `/ciudad`: una **plaza conceptual** con seis distritos vinculados a rutas existentes: catálogo `/tours`, territorio `/map`, comunidad `/participar`, movilidad `/flights`, itinerarios `/itinerary` y asesoría `/ai`. No representa un mapa físico ni inventa empresas, convenios o disponibilidad.
- `src/pages/DigitalCityArchitecturePage.tsx`: interfaz responsive con orientación, mapa esquemático, selección de distritos, accesos directos y criterios de confianza verificable.
- `src/components/DigitalCityGateway.tsx`: acceso visual desde la portada turística actual, sin reemplazar buscador, catálogo, fuentes ni servicios de dominio.
- `src/data/digitalCityDistricts.ts`: contrato central para identidad de distritos, destinos reales y textos ES/EN.
- `src/components/Footer.tsx`, `src/components/RouteMetadata.tsx` y `src/App.tsx`: descubrimiento, metadatos y ruta lazy.
- `tests/digitalCityArchitecturalNavigation.test.ts`: pruebas de rutas reales, etiquetas, estructura semántica y enlaces.
- El diseño se inspira en urbanismo tropical contemporáneo (plaza, accesos y distritos) y apunta a WCAG 2.2 AA. **No se afirma certificación de accesibilidad ni verificación completa de navegación en producción**.

Mantener la ciudad administrativa detrás del sistema de roles existente; separar módulos visuales de decisiones, reservas y pagos reales. Cualquier entidad o servicio futuro necesita fuente, consentimiento, autorización, revisión y estado verificable antes de mostrarse como activo.


---

## 38. Navegación del catálogo, filtros compartibles y enlaces verificados (2026-10-12)

**Corrección orientada a auditoría de clics:** `src/utils/catalogRouteFilters.ts` centraliza lectura/validación de `q`, `category`, `region`, `difficulty`, `maxPrice` y `favorites` en `/tours`. El catálogo usa la URL como fuente de verdad para soportar enlaces compartidos, recarga, historial y navegación entre secciones sin carreras entre efectos React.

- `src/pages/ToursPage.tsx` modifica cada filtro mediante un parche explícito de la URL y restablece todos los filtros en una única acción; mantiene favoritos sin borrar accidentalmente el parámetro con cada búsqueda.
- `src/App.tsx` **solo hidrata** el estado compartido desde el URL del catálogo y no vuelve a sobrescribir enlaces entrantes antes de procesarlos. Se conserva selección desde portada y navegación regional utilizando URLs explícitas.
- Hero, tarjetas de categorías, destinos y mapa navegan con `catalogSearchHref`, de modo que una selección de categoría/región abra la lista correspondiente y no una vista general por accidente.
- Footer: enlace “Aventura y canopy” usa la categoría real `canopy` del catálogo, en lugar de `adventure`, que no es un identificador admitido.
- Los controles de precio no dicen “sin límite” a USD 200 cuando el filtro aún excluye opciones; el precio máximo predeterminado de interfaz USD 500 desactiva el filtro de precio. No se introducen tarifas ni supuestos de disponibilidad.
- `tests/catalogRouteFilters.test.ts` cubre categorías válidas, filtros combinados, favoritos, restablecimiento y entradas inválidas.

**Alcance:** corrección del comportamiento de navegación, no una certificación de pagos, reservas, filtros SEO o de todos los clics. Pruebas Playwright de solo lectura existentes en `scripts/auditReadOnlyNavigation.mjs` siguen siendo la base del inventario progresivo. Validar también variantes ES/EN, móvil y `popstate` del navegador antes de ampliar su cobertura automatizada.


---

## 39. Contacto público y derivación responsable con IA (2026-10-12)

La regla comercial `consulta pública → agente IA → evaluación de contexto → respuesta o derivación humana` usa el flujo **existente** `src/utils/customerIntake.ts` y su evento `customer-intake-request`, manejado por `src/App.tsx` mediante `POST /api/customer-intake`. **No se crea otro agente, sistema de mensajería ni reserva paralela.**

- Encabezado (escritorio y móvil), pie de página, portada (confianza y tours destacados), operadores, regiones, detalle de tours y consultas de buses usan ahora `requestCustomerIntake` antes de ofrecer contacto externo.
- En transportes privados, shuttles, alquiler de autos y vuelos domésticos, las ocho acciones iniciales de cotización conservan el texto de ruta/servicio, con `source` trazable; las solicitudes no equivalen a precios ni cupos confirmados.
- El backend decide si requiere intervención humana. El flujo del modal existente presenta el enlace de derivación devuelto por la IA; ante fallo, indica explícitamente que no hay reserva ni notificación confirmadas y ofrece el WhatsApp comercial como contingencia.
- `tests/publicAiIntakeRouting.test.ts` añade verificación contractual contra enlaces iniciales que evadan el enrutamiento IA.
- **Fuera de alcance:** enlaces de compartir comprobantes o atención que aparecen **después** de una compra/reserva o de asistencia dentro de IA; esos flujos requieren revisión diferenciada, no se deben bloquear ciegamente. Correos `mailto:` públicos, políticas de consentimiento y UX completa siguen bajo auditoría.

**Importante:** un clic abre una solicitud atendida por el flujo actual; no afirmar que existe proveedor confirmado, cobro procesado, inventario reservado ni comunicación humana recibida sin evidencia del servicio transaccional. Mantener ES/EN y la escalación cuando corresponda.


---

## 40. Oficina Digital de Agentes — Fase 1: contratos y bitácora (2026-10-12)

La primera fase de la **Oficina Digital de Agentes** agrega únicamente el plano de datos y la bitácora auditable. No activa todavía JARVIS autónomo, heartbeat, controles de apagado ni el plano isométrico.

- `shared/agentOfficeTypes.ts`: contratos estrictos para estados (`idle`, `working`, `waiting_approval`, `blocked`, `paused`, `revoked`, `no_signal`), autonomía 0–3, oficinas, telemetría, `agentRuns` y steps.
- `backend/agentRegistryService.ts`: materializa en `agents` las identidades que **ya existen** en `agentKnowledgeFabric.ts`. Una identidad nueva sin asignación explícita de oficina hace fallar la sincronización en vez de ser colocada de forma ficticia.
- Todo agente nuevo se crea conservadoramente con `autonomyLevel: 0`, `status: no_signal`, `currentTask: null`, `lastHeartbeatAt: null`, `usageToday: null`, `model: null` y `allowedTools: []`. Cero actividad o coste no se presenta como telemetría medida cuando no existe evidencia.
- Las nueve oficinas objetivo ya tienen contrato ES/EN. Marketing Internacional, Finanzas y Sala de JARVIS pueden permanecer vacías hasta que exista un agente real para ocuparlas; no se crean empleados sintéticos solo para llenar el plano.
- `backend/agentRunLedgerService.ts`: crea ejecuciones con ciclo monotónico, steps secuenciales y resultados resumidos. Se guarda `decisionSummary` auditable; **no se persiste chain-of-thought privado**.
- Los steps son append-only desde el servicio y no pueden añadirse a una ejecución terminal. El documento raíz mantiene únicamente la proyección de estado y el último número de step.
- `firestore.rules`: `agents`, `agentRuns` y `agentRuns/{runId}/steps` quedan legibles solo para administración autenticada y **sin escrituras desde el navegador**. El backend autorizado usa Firebase Admin.
- Esta fase no cambia reservas, pagos, disponibilidad, proveedores, precios ni mensajería y no crea un segundo sistema de agentes.

**Siguiente fase:** instrumentar `operationalEventBus`, heartbeat de 15 segundos y proyección de `no_signal` después de 60 segundos sin latido, manteniendo como desconocido cualquier estado sin telemetría verificable.


---

## 41. Oficina Digital de Agentes — Fase 2: eventos y heartbeat (2026-10-12)

La telemetría de la Oficina Digital se apoya en el registro `agents` de la Fase 1 y en el bus existente; no crea un segundo sistema de eventos.

- `operationalEventBus.ts` incorpora los eventos tipados `agent.started`, `agent.step`, `agent.waiting_approval`, `agent.completed`, `agent.failed` y `agent.heartbeat` (además de pausa/revocación para la siguiente fase). Los heartbeats se publican sin volver a pasar por el supervisor para evitar recursión y tormentas de mensajes.
- `agentRuntimeService.ts` define heartbeat cada **15 segundos** durante una ejecución instrumentada. El lease deja de renovar si la tarea ya no corresponde o el agente está pausado/revocado.
- `agentOfficeProjection.ts` considera una telemetría ejecutable válida solo durante **60 segundos** desde el último heartbeat. Después muestra `no_signal`; un evento genérico reciente no puede convertir un agente en `working`.
- Heartbeats o eventos con timestamps futuros se rechazan para la proyección. Los estados de gobierno `paused` y `revoked` se conservan aunque no exista heartbeat, porque representan una decisión explícita y no actividad inferida.
- `adminControlCenterService.ts` usa el registro persistido para el estado del agente. Si Firestore no contiene el registro, utiliza únicamente el perfil estático con `no_signal`; nunca deduce `idle`.
- El servidor sincroniza de forma idempotente las identidades existentes al iniciar. La sincronización es transaccional y no reinicia estado, autonomía, tarea, heartbeat, modelo, herramientas ni consumo de un agente ya creado.
- Las pruebas cubren el umbral exacto de 60 segundos, heartbeat de 15 segundos, eventos requeridos, pérdida de señal, timestamps futuros y preservación de estados de gobierno.

**Límite de esta fase:** los servicios existentes todavía deben envolver sus ejecuciones con el runtime para que aparezcan como `working`. Si un flujo no está instrumentado, la interfaz seguirá mostrando `no_signal` en lugar de inventar actividad.


---

## 42. Oficina Digital de Agentes — Fase 3: gobernanza del owner (2026-10-12)

La Fase 3 introduce una autoridad explícita de propietario sin convertir el navegador en fuente de verdad ni ampliar la autonomía comercial de los agentes.

- `authMiddleware.ts` reconoce el rol `owner` mediante custom claim (`role=owner` o `owner=true`) o el correo exacto configurado en `OWNER_EMAIL`. La llave heredada `X-Operator-Key` conserva únicamente rol `operator` y nunca puede convertirse en owner.
- `agentGovernanceService.ts` implementa autonomía por agente, pausa, revocación, restauración y apagado/reanudación global. Toda mutación requiere owner y queda registrada en `agent_audit_log`.
- Cada agente tiene un `authorizationEpoch`. Cualquier cambio de autonomía, pausa, revocación o apagado incrementa esa generación. Una ejecución que conserve una generación antigua deja de renovar heartbeat y no puede continuar publicando nuevos steps instrumentados.
- `agentCancellationRegistry.ts` permite cancelar inmediatamente con `AbortController` las ejecuciones instrumentadas en la instancia actual. En sistemas distribuidos la barrera autoritativa es Firestore + `authorizationEpoch`; no se afirma que una API externa ya enviada pueda deshacacerse de forma mágica.
- El apagado global persiste en `agent_governance/global`. Al activarlo, agentes no revocados pasan a `paused`; al reanudar, únicamente los pausados por el apagado global regresan a `no_signal`. Las revocaciones individuales se conservan.
- `ownerApprovalService.ts` añade una cola one-shot para `payment`, `refund`, `payout`, `customer_message`, `mass_message`, `price_change` y `publication`. Aprobar no ejecuta la acción: genera una autorización consumible una sola vez por la acción y el recurso exactos.
- `autonomyPolicy.ts` marca esas siete clases como siempre humanas en niveles 0–3.
- Firestore mantiene Default Deny: aprobaciones y auditoría son de lectura owner-only y todas las escrituras del navegador están bloqueadas.
- El endpoint genérico de `platform-controls` no puede modificar `agentsDisabled`; el kill switch solo existe en las rutas owner-only de la Oficina Digital.
- Las decisiones pendientes de `adminAICommandService` pueden ser propuestas por admin/owner, pero aprobar o rechazar queda reservado al owner.

**Límite de esta fase:** las operaciones heredadas de reservas, pagos y mensajería existentes no se reescriben ni se duplican. La barrera de gobernanza debe envolverse en cada nueva ejecución/JARVIS/tool-call; una integración antigua no instrumentada no debe presentarse como revocable en tiempo real.
