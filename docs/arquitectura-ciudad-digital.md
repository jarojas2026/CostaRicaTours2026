# Costa Rica Tours como ciudad digital
## Arquitectura maestra, plan de implementación y criterios de aceptación

**Estado:** propuesta de arquitectura versionada; requiere revisión técnica y ejecución por etapas.  
**Rama inicial:** `feat/digital-city-architecture`  
**Principio rector:** ampliar el sistema existente sin sustituir ni romper los flujos operativos que ya funcionan.

## 1. Objetivo

Convertir Costa Rica Tours en una plataforma turística interoperable que conecte personas, empresas, lugares, servicios, disponibilidad, reservas, pagos, eventos, reglas y automatización inteligente. La plataforma debe poder crecer por región y categoría sin duplicar la lógica central.

El objetivo no es crear una aplicación independiente por módulo. Es compartir identidades, identificadores, estados, permisos y eventos de negocio, manteniendo límites claros entre dominios.

## 2. Principios no negociables

1. **Fuente de verdad:** cada dato operativo debe tener una fuente responsable identificable.
2. **No inventar disponibilidad, precios ni confirmaciones:** la IA solo comunica lo que devuelven fuentes verificables y debe indicar cuando un dato está pendiente o desactualizado.
3. **Backend autoritativo:** precio final, cupos, confirmación, pagos, comisiones, reembolsos y permisos se validan en el servidor.
4. **Default deny:** las reglas de Firestore continúan denegando por defecto. No se conceden escrituras amplias para facilitar una pantalla.
5. **Compatibilidad:** antes de cambiar colecciones, contratos, rutas o estados existentes, identificar consumidores y añadir pruebas de regresión.
6. **Trazabilidad:** las operaciones relevantes dejan un registro auditable sin almacenar secretos ni datos personales innecesarios.
7. **Idempotencia:** reintentos de webhooks, tareas o peticiones no pueden crear dos reservas, dos cargos o dos liquidaciones.
8. **Accesibilidad y bilingüismo:** la experiencia mantiene español e inglés, diseño móvil y estándares de accesibilidad.
9. **Automatización nativa:** los flujos se implementan en el código/infraestructura del proyecto; no se introduce n8n ni Telegram como dependencia.
10. **Despliegue seguro:** trabajar en ramas y Pull Requests; ejecutar los controles del repositorio antes de promover cambios.

## 3. Mapa del ecosistema

### Actores e identidad
- Turista/cliente.
- Proveedor u organización.
- Guía o colaborador del proveedor.
- Operador/gestor de reservas.
- Soporte y resolución de incidencias.
- Administrador y superadministrador.
- Sistemas externos autorizados.

Una persona puede pertenecer a una o varias organizaciones. Los permisos de organización deben separarse de los permisos globales. No confiar en un rol enviado desde el navegador; resolver los permisos desde claims confiables y/o registros controlados por el servidor.

### Dominios de negocio
1. **Identidad y organizaciones:** perfiles, membresías, invitaciones, roles, verificación y estado.
2. **Catálogo:** servicios, categorías, atributos, medios, idioma, ubicación, políticas y estado de publicación.
3. **Geografía:** país, provincia, cantón, localidad, puntos de interés, coordenadas y zonas turísticas.
4. **Disponibilidad e inventario:** calendarios, cupos, unidades, bloqueos temporales, fuente y vigencia de los datos.
5. **Solicitudes y reservas:** cotización, solicitud, confirmación, cancelación, cumplimiento y reclamaciones.
6. **Pagos y liquidaciones:** intentos, referencias de pasarela, comisiones, reembolsos, saldos y conciliación.
7. **Eventos:** organizador, horario, ubicación, capacidad, entradas, estado y servicios asociados.
8. **Comunicaciones:** notificaciones, mensajes, plantillas, preferencias y registro de entrega.
9. **Confianza y cumplimiento:** documentos, verificación, reseñas vinculadas a experiencias, incidencias y auditoría.
10. **IA y automatización:** asistente, herramientas, tareas, reglas, aprobaciones y resultados observables.
11. **Analítica:** búsquedas, embudos, disponibilidad, confirmaciones, ventas, calidad y rendimiento.
12. **Administración:** configuración, revisión, moderación, soporte y gestión de excepciones.

## 4. Modelo canónico de datos

Los nombres siguientes describen conceptos lógicos. No se deben crear colecciones nuevas automáticamente si ya existe una colección equivalente. Primero hay que mapear el modelo actual y decidir si corresponde reutilizar, adaptar o migrar.

| Entidad lógica | Campos esenciales | Relación/propósito |
|---|---|---|
| Person/User | id, estado, idioma, createdAt, updatedAt | Identidad de una persona |
| Organization | id, nombre, tipo, estado, verificación | Empresa/proveedor |
| Membership | userId, organizationId, rol, estado | Relación persona-empresa |
| Place | id, nombre, región, coordenadas, estado | Lugar turístico o punto de encuentro |
| Service | id, organizationId, categoría, lugar, moneda, precio base, capacidad, estado | Tour, traslado, alojamiento, experiencia u otro servicio |
| ServicePolicy | serviceId, cancelación, requisitos, restricciones, versión | Condiciones publicadas y aplicables |
| AvailabilitySlot | serviceId, inicio, fin, capacidad, reservados, fuente, checkedAt, expiresAt | Cupos/horarios; no sustituye al inventario de origen |
| Booking | id, customerId, serviceId, providerId, fechas, participantes, precio congelado, moneda, estado, version | Compromiso comercial |
| BookingEvent | bookingId, tipo, actor, timestamp, datos mínimos | Historial inmutable de transiciones |
| Payment | id, bookingId, proveedor de pagos, moneda, importe, estado, referencia externa | Intento/resultado de cobro |
| LedgerEntry | id, bookingId, tipo, importe, moneda, referencia, createdAt | Registro de movimientos financieros |
| Payout | providerId, periodo, importe, estado, referencia | Liquidación al proveedor |
| Event | id, organizerId, placeId, inicio, fin, capacidad, estado, fuente | Evento turístico/cultural |
| Notification | id, recipientId, channel, template, status, attempts | Entrega y reintentos |
| Verification | organizationId, tipo, estado, verificadoPor, fechas | Evidencia de verificación |
| AuditEvent | actor, acción, entidad, resultado, timestamp, correlationId | Auditoría sin secretos |
| IntegrationConnection | providerId, tipo, estado, capacidades, lastSyncAt | Conector a proveedor externo |
| AutomationJob | tipo, estado, attempts, nextRunAt, idempotencyKey | Trabajo confiable y recuperable |

### Reglas del modelo
- Usar identificadores estables y referencias explícitas; no depender de nombres visibles como claves.
- Guardar dinero como unidades menores enteras cuando sea aplicable, con moneda explícita; no mezclar CRC y USD.
- Guardar timestamps en UTC y mostrar la hora local de Costa Rica cuando corresponda.
- Congelar en la reserva el precio, la moneda, impuestos/comisiones aplicables, política y descripción relevantes al momento de confirmar.
- Separar estado de pago de estado de reserva: pueden cambiar de manera independiente.
- No almacenar datos de tarjeta completos ni credenciales de pago.
- Evitar datos sensibles en logs, prompts, analítica y documentos de auditoría.
- Definir retención y eliminación de datos personales antes de ampliar el registro de actividad.

## 5. Disponibilidad: niveles de confianza

Cada respuesta de disponibilidad debe contener como mínimo el servicio, rango horario, cantidad solicitada, fuente, momento de consulta, estado y caducidad.

Estados lógicos recomendados:
- `unknown`: sin evidencia suficiente.
- `published`: información de catálogo; no significa cupo confirmado.
- `checking`: consulta en curso.
- `available_unconfirmed`: fuente consultada, pero todavía no existe una reserva protegida.
- `held`: cupo bloqueado temporalmente por operación atómica con vencimiento.
- `confirmed`: proveedor/inventario confirmó y el compromiso quedó registrado.
- `unavailable`: la fuente informó que no hay cupo.
- `stale`: el dato superó su vigencia.
- `failed`: no se pudo verificar.

Reglas:
1. Mostrar al cliente la diferencia entre disponible, pendiente de confirmación y confirmado.
2. Establecer una vigencia configurable por tipo de servicio y capacidad del proveedor.
3. No aceptar una reserva confirmada a partir de un dato vencido.
4. Evitar sobreventa con transacción atómica o mecanismo equivalente en la fuente de inventario.
5. Liberar bloqueos vencidos y recuperarlos con tareas idempotentes.
6. Para proveedores manuales, crear una solicitud con SLA, recordatorios y escalamiento; no simular integración en tiempo real.
7. Registrar fuente y fecha de la última verificación.
8. Si una integración falla, ofrecer alternativas o una solicitud pendiente, no una falsa garantía.

## 6. Ciclo de vida de reservas

El flujo se debe alinear con los contratos actuales antes de cambiar los nombres de estados.

Flujo conceptual:
1. Validar servicio, fecha, participantes, moneda y restricciones.
2. Consultar disponibilidad con una fuente identificable.
3. Calcular cotización en backend y guardar desglose.
4. Crear solicitud o bloqueo temporal con idempotency key.
5. Obtener confirmación del proveedor o sistema de inventario.
6. Ejecutar el paso de pago que corresponda al contrato del servicio.
7. Verificar el resultado desde el backend/webhook firmado.
8. Confirmar la reserva y emitir comprobante/voucher.
9. Enviar notificaciones con reintentos controlados.
10. Antes de la fecha, enviar recordatorios y detectar incidencias.
11. Registrar cumplimiento, cancelación o no presentación.
12. Conciliar pago, comisión, reembolso y liquidación.
13. Permitir reseña solo según reglas de elegibilidad.

Las transiciones deben validarse en el servidor. Las operaciones financieras no deben depender de que el navegador vuelva a una página de éxito. Reembolsos y excepciones financieras requieren autorización humana, de acuerdo con las reglas actuales del proyecto.

## 7. Pagos, contabilidad operativa y conciliación

- Mantener Stripe/otros proveedores detrás de una interfaz de pagos en el backend.
- Verificar firmas de webhook, importe, moneda, referencia, ambiente y estado.
- Deduplicar webhooks mediante identificadores del proveedor.
- No considerar una reserva pagada por una captura de pantalla, referencia libre o parámetro del cliente.
- Registrar bruto, impuestos cuando correspondan, comisión de plataforma, comisión de pasarela, reembolso, saldo del proveedor y neto.
- Separar autorización, captura, fallo, disputa, reembolso y liquidación.
- Ejecutar conciliación periódica entre registros internos y reportes del proveedor.
- No activar cobros reales hasta revisar credenciales de producción, términos comerciales, impuestos, políticas de reembolso y pruebas de punta a punta.

## 8. Eventos, lugares y paquetes

Un evento puede relacionarse con un lugar, organizador y servicios cercanos. No se deben convertir recomendaciones en afirmaciones de disponibilidad.

- Normalizar zona horaria y rangos de fecha.
- Mantener fuente, última verificación y estado editorial.
- Distinguir anunciado, confirmado, pospuesto, cancelado y finalizado.
- Gestionar capacidad/entradas como inventario si la plataforma vende entradas.
- Recomendar alojamiento, transporte o tours por geografía y compatibilidad temporal.
- Evitar paquetes que incluyan servicios sin precio y disponibilidad comprobados.
- Ofrecer filtros de accesibilidad, intensidad, edad/requisitos y sostenibilidad cuando haya datos verificables.

## 9. Arquitectura técnica objetivo

### Mantener inicialmente un backend modular
El proyecto actual utiliza React/TypeScript, Express, Firebase/Firestore y herramientas de IA. Mantener el stack mientras una necesidad medida no justifique una migración.

Límites sugeridos dentro del backend:
- `identity`
- `organizations`
- `catalog`
- `places`
- `availability`
- `bookings`
- `payments`
- `events`
- `communications`
- `trust`
- `automation`
- `ai`
- `analytics`

Cada módulo debe exponer funciones de dominio y contratos tipados; evitar que componentes de interfaz escriban directamente en datos operativos sensibles.

### Eventos internos
Para cambios importantes, usar eventos de dominio explícitos (por ejemplo `booking.requested`, `availability.held`, `booking.confirmed`, `payment.succeeded`, `booking.cancelled`, `payout.ready`). Los eventos deben tener versión, identificador, fecha, correlación e idempotencia. Si la entrega fiable entre Firestore y tareas externas lo exige, evaluar un patrón outbox/cola gestionada; no introducir complejidad sin necesidad demostrada.

### Integraciones
Cada conector declara capacidades: consulta de disponibilidad, creación de reserva, cancelación, actualización de precios, consulta de estado. Las capacidades desconocidas se tratan como no soportadas. Las credenciales se guardan solo en el servidor/secret manager.

## 10. IA con límites operativos

La IA puede:
- interpretar peticiones en lenguaje natural;
- convertirlas a filtros estructurados;
- consultar catálogo, ubicaciones y disponibilidad mediante herramientas autorizadas;
- preparar itinerarios y cotizaciones con desglose y fuentes;
- resumir solicitudes y comunicaciones;
- detectar falta de respuesta y sugerir alternativas;
- explicar reglas y estados en español e inglés.

La IA no puede:
- inventar precio, cupo, proveedor, certificación, reseña o evento;
- confirmar pago o reserva sin evidencia del sistema;
- saltarse permisos, reglas de negocio o políticas;
- ejecutar reembolsos automáticos sin autorización humana;
- acceder a datos de otro cliente o empresa sin permiso.

Las herramientas deben validar argumentos, aplicar autorización en cada llamada, limitar resultados, registrar el resultado y devolver errores tipados. Aplicar límites de tiempo, máximo de reintentos y escalamiento humano.

## 11. Seguridad, privacidad y abuso

- Revisar cada endpoint con autenticación, autorización por recurso y validación de entrada.
- Mantener Default Deny en Firestore y ejecutar pruebas de reglas con Emulator Suite cuando esté disponible.
- Limitar tasa de endpoints públicos y herramientas de IA.
- Validar webhooks y prevenir replay/doble procesamiento.
- Usar secretos de CI/CD y producción; nunca incluirlos en archivos, logs o variables públicas.
- Aplicar mínimo privilegio a service accounts.
- Proteger documentos de proveedores y separar su lectura de los datos públicos.
- Implementar exportación, corrección y eliminación de datos personales según obligaciones aplicables.
- Establecer retención para chats, auditoría y documentos.
- Registrar accesos administrativos y cambios de permisos.
- Probar ataques de IDOR, escalada de privilegios, spam de reservas y abuso de reintentos.

## 12. Observabilidad y recuperación

Métricas mínimas:
- porcentaje de búsquedas con resultados;
- frescura de disponibilidad;
- tiempo de respuesta de proveedor;
- conversión de búsqueda a solicitud y reserva;
- reservas confirmadas, canceladas y fallidas;
- fallos de pago y discrepancias de conciliación;
- notificaciones no entregadas;
- errores de integración y de herramientas de IA;
- gasto/latencia de IA;
- incidencias de seguridad.

Cada operación que atraviese módulos debe tener un `correlationId`. Los errores deben distinguir fallos recuperables de permanentes. Los reintentos deben tener backoff y límites. Crear alertas para pagos incoherentes, reservas duplicadas, integraciones detenidas y trabajos atascados.

## 13. Plan de ejecución por fases

### Fase 0 — Inventario y mapa de contratos (obligatoria)
- Enumerar rutas API, servicios de dominio, colecciones Firestore, reglas, tareas y agentes existentes.
- Mapear el flujo actual de reserva, pago, disponibilidad, notificación y escalamiento.
- Identificar duplicados, estados incompatibles, integraciones activas y funciones solo simuladas.
- Establecer pruebas base y resultados del build actual.
**Aceptación:** inventario con ruta/archivo, propósito, consumidores, estado real y riesgos; ninguna modificación destructiva.

### Fase 1 — Modelo canónico y contratos
- Comparar entidades propuestas con datos y tipos existentes.
- Definir DTOs/validaciones compartidos y mapa de estados.
- Documentar migraciones compatibles y estrategia de rollback.
- Añadir fixtures y pruebas de contratos.
**Aceptación:** cada entidad operativa tiene propietario de dato, ID, validación y pruebas; no se crean duplicados innecesarios.

### Fase 2 — Identidad, organizaciones y proveedores
- Verificar roles, membresías y límites entre empresas.
- Completar flujo de registro/revisión de proveedor.
- Proteger datos privados y acciones administrativas.
**Aceptación:** pruebas positivas y negativas de acceso para turista, proveedor, operador y administrador.

### Fase 3 — Catálogo, lugares y eventos
- Normalizar atributos de servicio y ubicación.
- Añadir estado editorial, idioma, fuente y frescura.
- Relacionar eventos y servicios sin duplicar datos.
**Aceptación:** filtros consistentes, páginas accesibles y datos sin afirmaciones no verificadas.

### Fase 4 — Disponibilidad e inventario
- Unificar el contrato de disponibilidad.
- Incorporar TTL, bloqueos, expiración y protección contra sobreventa.
- Implementar modo manual y adaptadores de integración.
**Aceptación:** pruebas de carrera, cupo agotado, timeout, dato obsoleto y proveedor que no responde.

### Fase 5 — Reservas y comunicaciones
- Formalizar máquina de estados y transiciones autorizadas.
- Hacer idempotentes creación, actualización y notificación.
- Implementar SLA y escalamiento para solicitudes manuales.
**Aceptación:** un reintento no duplica la reserva; toda transición deja registro; mensajes fallidos se recuperan o escalan.

### Fase 6 — Pagos y liquidaciones
- Auditar la pasarela y los webhooks existentes.
- Separar estados de reserva y pago.
- Registrar comisión y conciliación; añadir pruebas de duplicados y reembolsos.
**Aceptación:** solo una evidencia válida del servidor marca pago; duplicados no generan cargos ni liquidaciones adicionales.

### Fase 7 — IA y automatización
- Conectar el asistente a herramientas del dominio ya validadas.
- Restringir cada herramienta por usuario/organización y esquema de argumentos.
- Añadir trazas, límites, confirmación humana y pruebas de alucinación operativa.
**Aceptación:** la IA reconoce falta de datos, no inventa cupos/precios y no ejecuta acciones fuera de permisos.

### Fase 8 — Paneles y analítica
- Crear paneles de proveedor, operaciones y administración según roles.
- Medir embudo, frescura, SLA, conversión e incidencias.
**Aceptación:** los indicadores se derivan de operaciones reales y tienen definiciones documentadas.

### Fase 9 — Escala y socios
- Medir cuellos de botella antes de dividir servicios.
- Documentar API/versiones y cuotas para socios.
- Probar carga, restauración y procedimientos de incidentes.
**Aceptación:** objetivos de latencia/carga definidos, alertas y rollback practicados.

## 14. Puerta de calidad para cada Pull Request

Antes de fusionar:
- [ ] Compilación y chequeo de tipos.
- [ ] Pruebas de contratos y regresión relacionadas.
- [ ] Auditorías de seguridad existentes.
- [ ] Pruebas de permisos y validación del backend.
- [ ] No se exponen secretos ni datos personales en logs.
- [ ] No hay estados, precios ni disponibilidad ficticios.
- [ ] La interfaz conserva español/inglés y accesibilidad.
- [ ] Migraciones y compatibilidad documentadas.
- [ ] Criterios de aceptación demostrados.
- [ ] Riesgos, pendientes y plan de reversión registrados.

## 15. Primera secuencia de trabajo recomendada

1. Completar el inventario de rutas, servicios, colecciones, agentes, tareas y flujos existentes.
2. Leer las auditorías recientes y los contratos de reservas/proveedores antes de modificar el modelo.
3. Crear una matriz de cobertura: implementado y probado / implementado sin pruebas suficientes / parcial / ausente / bloqueado por credenciales o decisión externa.
4. Priorizar los fallos que puedan provocar reserva falsa, doble cobro, fuga de datos o pérdida de solicitudes.
5. Entregar cambios pequeños en Pull Requests independientes, empezando por contratos y pruebas, después backend, y finalmente UI.
6. Desplegar primero en preview/staging; producción solo después de validación explícita.

## 16. Registro de decisiones pendientes

Estas decisiones no deben inventarse:
- pasarela y modelo contractual final de cobro/liquidación;
- proveedores prioritarios para integración de disponibilidad;
- SLA por categoría y proveedor;
- política de cancelación y reembolso por servicio;
- fuente oficial para cada categoría de eventos y restricciones;
- retención legal/operativa de datos;
- objetivos de disponibilidad, latencia y presupuesto de infraestructura.

Cada decisión debe registrar responsable, fecha, opciones consideradas y efecto sobre los contratos.

---

**Importante:** este documento define el objetivo y el proceso de implementación; no afirma que todas las capacidades estén ya construidas. El estado real de cada fase se debe determinar con el inventario del código, pruebas y despliegues.
