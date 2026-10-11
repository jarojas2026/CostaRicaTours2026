# Knowledge City — Ventas + Soporte + IA (primera entrega integrada)

## Alcance implementado
- Gestión editorial de conocimiento en la colección nueva knowledge_city_articles (no reemplaza bookings, organizational_flow_events, catálogo ni los servicios de pagos).
- Acceso administrativo en el Centro de Control /admin: crear/editar artículos bilingües, definir categoría/visibilidad, revisar fuente, fechas y estado, visualizar muestras de reservas y eventos de soporte.
- API /api/admin/knowledge: rutas de lectura con autenticación de operador y publicación/edición exclusiva para administradores autenticados por Firebase con correo.
- Conexión del asistente: agentKnowledgeFabric recupera **solo artículos públicos publicados, no vencidos y con evidencia**. No expone playbooks internos, borradores, datos personales ni resultados de reservas.
- Customer Intake registra evento mínimo en organizational_flow_events por solicitud, sin texto ni contacto, para alimentar el panel de soporte ya existente.
- Pruebas unitarias para evidencia, caducidad, versiones, bilingüismo y segmentación de visibilidad.

## Diseño de verdad y sincronización
- **Ventas:** indicadores de una muestra máxima de 100 reservas leídas desde Firestore; son estados operativos, no totales contables ni ventas netas.
- **Soporte:** muestra máxima de 100 eventos recientes ordenados por creación; solicitudes escaladas quedan señaladas para revisión humana.
- **Knowledge:** hasta 200 artículos leídos de Firestore; filtrado determinista por estado, fuente, revisión y vencimiento. La búsqueda utiliza puntuación léxica, no embeddings.
- **Sincronización:** *read-through* en cada petición, actualizado por la interfaz cada 60 segundos. No se anuncia como streaming en tiempo real.
- **Integración IA:** el artículo recuperado se incorpora como referencia de contenido, no como instrucción ni como confirmación de operaciones. Precio, cupo, pagos, reserva y reembolso se comprueban siempre con las herramientas de dominio existentes.

## Gobierno editorial
1. Crear un borrador en ES y EN con título y respuesta.
2. Adjuntar una URL pública HTTPS o una referencia interna verificable con prefijo catalog:, policy:, provider:, ict: o sinac:.
3. Verificar manualmente la fuente y dejar constancia de la fecha.
4. Establecer una caducidad futura no mayor a un año.
5. Publicar desde el panel con la casilla de revisión expresa; el backend registra el editor desde el token, nunca desde el navegador.
6. Revisar y actualizar artículos vencidos antes de volver a usarlos. Los cambios exigen número de versión esperado para evitar sobrescrituras concurrentes.
7. Archivar cuando la información deje de ser aplicable.

## Seguridad y límites
- Las rutas de Knowledge requieren requireOperator; publicar exige rol admin y email del ID token. X-Operator-Key no sirve para publicar.
- Firestore mantiene su política default deny; no se añadió lectura/escritura directa desde el cliente para la nueva colección.
- Los endpoints del backend usan límites de solicitudes y Cache-Control: no-store.
- Se excluye contenido interno de la recuperación para viajeros, incluso si contiene palabras coincidentes.
- Los eventos de Customer Intake no incluyen mensaje, nombres, correo, teléfono ni resultado del asistente.
- Solo se retorna al panel agregado de ventas/soporte, no mensajes de clientes ni datos de pago.
- **Sin migración de producción y sin cobros nuevos.** Revisar los secretos/identidad de Cloud Run y el estado de despliegues existentes antes de lanzar.

## Operaciones y pruebas requeridas
- Ejecutar npm run lint, npm run test:contracts, npm run build, auditorías y verificación de despliegue en la rama/PR.
- Probar con el emulador de Firestore o entorno staging: usuario público no accede a endpoints, operador solo consulta, administrador crea borrador, publica con evidencia, agente consulta artículo y deja de verlo cuando vence.
- Simular solicitud normal y escalada para comprobar la creación de un evento sin datos personales.
- Verificar que una nueva reserva actualiza la muestra de ventas y que un nuevo evento cambia la muestra de soporte en el refresco de 60 segundos.
- **No activar pagos reales** hasta completar pruebas end-to-end de conciliación, cancelación y autorizaciones.

## Próximas fases
- Paginación e índices para volúmenes mayores; búsqueda híbrida/vectorial con autorización por documento.
- Señales de brechas de contenido generadas a partir de estadísticas de soporte (borradores únicamente, nunca autopublicación).
- CRM de casos, SLA, agente asignado, gestión humana de reembolsos y auditoría de respuestas.
- Suscripciones de actualización y outbox duradero para integraciones externas y conciliación comercial; mantener idempotencia.
- Panel de salud de fuentes por proveedor y acuerdos, análisis de métricas de resolución/venta sin transferir datos personales a prompts.
