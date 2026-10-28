# Hoja de ruta: IA turística escalable sin gasto nuevo

**Estado:** propuesta técnica incremental; no desplegada, no activada y no autorizada para producir gastos.
**Objetivo:** mejorar la calidad, fiabilidad y capacidad de JARVIS / Concierge reutilizando los servicios existentes, sin crear un segundo sistema de reservas ni sustituir el backend canónico.

## Restricciones obligatorias

- Coste incremental objetivo: **$0** durante el desarrollo.
- No reactivar facturación de Google Cloud, Cloud Run, Cloud Build, APIs de pago, mapas con facturación, planes pagos ni despliegues.
- No añadir claves, secretos, cuentas de proveedor ni variables de entorno que requieran compra.
- No tocar `api/[...path].ts`, `Header` ni `BottomNav`; no modificar pagos.
- No borrar servicios, agentes, datos, ramas ni workflows existentes.
- No publicar cambios ni fusionar PR sin CI verde y aprobación explícita del propietario.
- No presentar este documento como implementación, benchmark o capacidad ya operativa.

## Diagnóstico arquitectónico inicial

El repositorio ya contiene piezas que conviene aprovechar en lugar de reconstruir: `backend/tourismIntelligenceEngine.ts`, `backend/jarvisTourismAdvisory.ts`, `backend/travelJourneyOrchestrator.ts`, `backend/agentTools.ts`, `backend/memoryService.ts`, `backend/semanticMemoryService.ts`, `backend/weatherPulseService.ts`, catálogo de tours, disponibilidad y servicios de reservas.

La mejora de mayor valor no consiste en añadir parámetros indiscriminadamente. Un modelo más grande puede mejorar algunas tareas de razonamiento, pero no garantiza datos correctos, inventario actualizado, bajas alucinaciones ni reservas exitosas. Para turismo, la calidad depende de combinar modelo, recuperación de conocimiento, herramientas de dominio, verificación de datos vivos, evaluación y límites operativos.

El README del proyecto describe JARVIS como consultivo y establece que los datos vivos deben verificarse. La infraestructura GCP está pausada por decisión del propietario. Por tanto, no se debe asumir que un proveedor de modelos está activo ni ejecutar solicitudes de inferencia que puedan generar cargos.

## Arquitectura objetivo

### 1. Router de modelos con política de coste

Reutilizar el router de IA existente (`backend/aiRouter.ts`) tras inspeccionarlo y probarlo. Cada tarea se clasifica por riesgo y complejidad:

- **Nivel 0 — determinista:** catálogo, reglas, validación, estados, permisos y cálculos que ya resuelve código.
- **Nivel 1 — modelo ligero disponible y autorizado:** clasificación de intención, extracción de fechas/pasajeros, traducción breve y FAQ basada en contexto.
- **Nivel 2 — modelo de mayor capacidad, solo si ya está autorizado y disponible:** itinerarios complejos, conflictos entre preferencias y síntesis de varias fuentes.
- **Nivel 3 — revisión humana:** pagos, reembolsos, cambios de precios, publicación comercial, mensajes salientes sensibles y cualquier decisión irreversible.

La selección debe fallar de forma cerrada cuando no exista un proveedor configurado, cuando no pueda comprobarse el coste o cuando el servicio esté deshabilitado. No activar fallback hacia un proveedor de pago de manera silenciosa.

### 2. Conocimiento turístico recuperable (RAG)

Construir las respuestas a partir de las fuentes canónicas existentes, sin duplicar datos comerciales en prompts:

1. Consultar primero catálogo y servicios de dominio.
2. Recuperar fragmentos relevantes de conocimiento turístico aprobado.
3. Etiquetar cada afirmación operativa con origen, fecha de observación, vigencia y estado de verificación.
4. Separar hechos estables de información viva.
5. Si falta evidencia, responder “por verificar” y ofrecer el siguiente paso.

Los embeddings y la memoria semántica son opcionales: reutilizar la implementación existente si está disponible y no genera gastos; de lo contrario, emplear recuperación léxica/determinista como degradación segura. No migrar bases ni crear infraestructura nueva para esta fase.

### 3. Agentes especializados, con un solo ciclo comercial

Mantener los agentes existentes y asignar responsabilidades explícitas:

- **Concierge:** entender intención y recopilar solo los datos necesarios.
- **Tourism Intelligence / JARVIS:** comparar regiones, temporadas, ritmo y logística; explicar incertidumbre.
- **Itinerary Planner:** proponer itinerarios compactos, no reservas.
- **Booking:** consultar el servicio canónico y devolver únicamente estados verificados.
- **Provider Liaison:** coordinar con los mecanismos existentes, respetando privacidad del operador.
- **Supervisor / Owner:** detectar contradicciones, riesgo, datos caducados y acciones que necesitan aprobación.
- **Learning:** proponer mejoras a partir de resultados reales y datos anonimizados; no autoeditar producción ni entrenar con datos personales sin base y autorización.

Los agentes deben compartir contratos tipados y un identificador de correlación del viaje. Evitar agentes duplicados, ciclos de herramientas sin límite y memoria cruzada entre viajeros.

### 4. Contrato de verdad y confianza

Toda respuesta sobre precio, cupo, reserva, pago, ruta, clima, apertura o proveedor debe distinguir:

- `verified`: comprobado mediante la fuente de dominio correspondiente;
- `estimated`: estimación claramente etiquetada;
- `stale`: fuente caducada;
- `unknown`: no se pudo comprobar.

No convertir una respuesta generada por un modelo en confirmación transaccional. Una reserva solo existe si el servicio canónico la creó correctamente; un pago solo es válido si la fuente de pagos autorizada lo confirma. No mostrar información interna del proveedor al cliente.

### 5. Memoria privada y mínima

Reutilizar los servicios de memoria existentes. Segmentar por `uid` y journey, respetar consentimiento, retención y limpieza de sesión; no usar datos de un viajero para responder a otro. No registrar prompts completos, credenciales, contactos, datos de pago ni información sensible en logs. Preferir métricas agregadas y ejemplos sintéticos para pruebas.

### 6. Evaluación antes de aumentar capacidad

Crear una batería determinista, sin llamadas a modelos externos, que pueda ejecutarse en CI:

- Respuestas sobre tours basadas solo en el catálogo.
- Precio/disponibilidad desconocidos: no inventar.
- Clima, rutas, horarios y cierres: exigir verificación viva.
- Itinerarios con duración insuficiente: advertir sobre exceso de traslados.
- Restricciones de actividad: escalar cuando corresponda, sin diagnosticar aptitud médica.
- Separación entre viajeros y aislamiento de memoria.
- Rechazo de herramientas no autorizadas y protección contra prompt injection.
- Límites de iteraciones, timeout, tamaño de contexto y salida.
- Privacidad pública de operadores.
- Ninguna acción de pago, publicación o mensaje sensible sin aprobación humana.

Registrar versión de prompt, versión de conocimiento, herramientas utilizadas, latencia y resultado de evaluación sin guardar PII. Usar un conjunto de casos fijo y comparar cambios antes de cambiar el modelo por defecto.

## Plan de implementación por fases

### Fase 0 — inventario y seguridad (solo lectura)
- Revisar router, registro de agentes/herramientas, memoria, contratos y pruebas existentes.
- Identificar qué proveedores y modelos están configurados sin leer ni exponer secretos.
- Confirmar que ninguna prueba hace llamadas pagadas.
- Documentar brechas y línea base; no cambiar infraestructura.

### Fase 1 — calidad sin nuevas dependencias
- Añadir casos de evaluación locales y contratos de salida.
- Mejorar instrucciones de incertidumbre y separación entre conocimiento estático y vivo.
- Reutilizar catálogo y servicios existentes; corregir duplicación de reglas solo tras verificar dependencias.
- Añadir límites deterministas y fallos seguros donde falten.

### Fase 2 — router y recuperación controlada
- Incorporar selección por complejidad/riesgo únicamente si el router actual lo permite.
- Habilitar solo proveedores ya autorizados y con coste verificable.
- Añadir caché solo para información estable y no personal; invalidar cuando cambie la fuente.
- Mantener deshabilitadas las inferencias externas durante CI y desarrollo sin presupuesto.

### Fase 3 — piloto supervisado
- Ejecutar pruebas offline y simulaciones.
- Evaluar muestras anonimizadas y revisadas por humanos.
- Medir exactitud factual, tasa de afirmaciones sin evidencia, cumplimiento de herramientas, éxito de tareas, latencia y coste por tarea.
- No habilitar tráfico real hasta que el propietario autorice explícitamente infraestructura y presupuesto.

### Fase 4 — optimización basada en evidencia
- Comparar modelos por tarea, no por número de parámetros.
- Considerar fine-tuning solo con un conjunto de datos legalmente autorizado, representativo y evaluado; no entrenar con datos de clientes por defecto.
- Evaluar modelos abiertos/locales solo cuando el coste total de cómputo, mantenimiento, seguridad y latencia sea aceptable.
- No comprar GPUs, contratar servicios ni activar facturación dentro de esta hoja de ruta.

## Métricas de aceptación propuestas

Las metas son objetivos de evaluación, no métricas actuales:

- 0 afirmaciones inventadas de precio, cupo, reserva o pago en los casos de contrato.
- 100% de las acciones sensibles bloqueadas sin autorización.
- 100% de aislamiento de memoria en pruebas multiusuario.
- 100% de afirmaciones de información viva marcadas como no verificadas cuando falla la fuente.
- Mejora de exactitud factual y éxito de tareas frente a una línea base reproducible.
- Coste incremental de desarrollo: $0.
- Ningún despliegue ni cambio de facturación.

## Fuera de alcance sin autorización explícita

- Despliegues a GCP o Vercel y reactivación de servicios pausados.
- Nuevas suscripciones, APIs facturables, modelos de pago o bases vectoriales administradas.
- Fine-tuning/entrenamiento con datos reales de viajeros.
- Cambios a pagos, reservas canónicas, gateway `api/[...path].ts`, navegación protegida o políticas de roles.
- Automatización autónoma de mensajes comerciales o transacciones.

## Criterio de finalización

Una fase se considera terminada únicamente cuando existe diff revisado, pruebas de contrato, TypeScript y CI verificables, evidencia de ausencia de gasto, descripción de rollback y aprobación del propietario cuando corresponda. Un documento o una rama no demuestra que la capacidad esté desplegada ni operativa.
