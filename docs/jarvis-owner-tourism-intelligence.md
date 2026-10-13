# JARVIS — Segunda mano del propietario: arquitectura y conocimiento turístico

**Corte de investigación:** 12 de octubre de 2026. **Estado de implementación:** núcleo consultivo reutilizable, no agente autónomo desplegado ni servicio de cobros.

## Regla central
JARVIS es un **rol supervisor del propietario**, no otro sistema de reservas. Su contenedor de ejecución propuesto es el **backend privado Node/TypeScript en Cloud Run**, aprovechando Firebase Admin, Firestore, los agentes y el motor nativo existentes. El frontend React únicamente presenta informes autenticados; no alberga secretos ni ejecuta tareas privilegiadas. Un trabajo programado/cola con idempotencia puede generar briefs persistidos y auditables cuando se habilite, nunca con escrituras privilegiadas desde el navegador.

**No se ha creado un segundo backend ni una instancia de Cloud Run en este PR.** `backend/jarvisTourismAdvisory.ts` implementa conocimiento versionado y un informe puro, sin efectos secundarios. La exposición futura debe reutilizar `adminControlCenterService.ts` y las rutas protegidas actuales, con controles de rol admin y aprobación humana para acciones irreversibles.

## Capas y límites
1. **Ingesta:** catálogo de tours, perfil y memoria del viajero, rutas, clima, disponibilidad, proveedores y fuentes oficiales. Etiquetar cada dato con origen, fecha de observación, caducidad y grado de verificación.
2. **Razón turística:** `tourismIntelligenceEngine.ts`, `travelJourneyOrchestrator.ts`, `weatherPulseService.ts` y los servicios existentes de itinerarios. JARVIS añade reglas consultivas, no las duplica.
3. **Ejecución comercial:** exclusivamente `bookingService.ts`, estado de reserva canónico, pagos verificados y despachos de proveedor ya autorizados. Ninguna inferencia turística confirma cupo, precio o cobro.
4. **Supervisión:** `adminControlCenterService.ts` y `adminAICommandService.ts`. Revisión humana para pagos, reembolsos, cambios de producción, mensajes masivos y escalamiento.
5. **Observabilidad:** correlación por journey, auditoría de comandos, tasas de error, edad de fuentes, alertas por rutas y entregas pendientes. Distinguir estado desconocido de éxito o cero.

## Costa Rica: conocimiento que debe enseñar el agente

**Geografía y logística.** La superficie del país no explica por sí sola el tiempo de viaje. La cordillera, las carreteras sinuosas, los puentes, la topografía, los desvíos, la lluvia y el tránsito metropolitano importan más que la distancia lineal. La Gran Área Metropolitana abarca núcleos de San José, Alajuela, Heredia y Cartago; revisar hora de salida y tráfico en tiempo real. No usar una velocidad constante ni calcular ETA dividiendo kilómetros entre una velocidad fija. Los accesos rurales pueden incluir lastre, piedra, barro y pendientes; la necesidad de 4x4 se verifica **por tramo y temporada**, no se presume para toda la provincia. Validar también peajes, ferris, estacionamiento, horarios de luz y duración de trasbordos.

**Polos turísticos y diferenciación.** Guanacaste y Península de Nicoya: playas, ecosistemas de bosque seco, parques marinos, surf, estancias de alta gama en algunos corredores, y traslados internos variables. Arenal y Llanuras del Norte: bosque húmedo, volcanes, aguas termales, aventura y fauna. Monteverde: bosque nuboso, aves y caminos de montaña. Pacífico Central: Manuel Antonio, Carara, costa y bosque tropical. Pacífico Sur y Osa: biodiversidad, Corcovado, Golfo Dulce y logística de acceso especial. Caribe Norte: Tortuguero y navegación. Caribe Sur: Cahuita, Puerto Viejo y diversidad cultural y ecológica. Valle Central: ciudades, cultura, volcanes y conexión aeroportuaria. Escazú y Rohrmoser son referencias de segmentos urbanos premium, **no una clasificación oficial ni una promesa de precios**.

**Ecosistemas y experiencias.** Avistamiento de ballenas y cetáceos; birdwatching (aves residentes y migratorias); caminatas nocturnas; anfibios, reptiles, mamíferos; bosques secos, húmedos, nubosos, manglares, arrecifes y hábitats marinos; volcanes, termales, senderismo, rafting, canopy, surf, buceo y turismo rural. Para cada experiencia: región, hábitat, accesibilidad, condición física, operador, estación, clima, permisos y alternativas. No garantizar avistamientos ni acceso a senderos nocturnos sin autorización.

**Ritmo y seguridad.** No diseñar un viaje de tres días que cruce cuatro regiones. Reservar márgenes para carreteras, clima, vuelos y check-in; evitar conducir por accesos desconocidos de noche cuando existan riesgos. Proponer rutas compactas con días de descanso y alternativas ante lluvia. Las recomendaciones no equivalen a confirmaciones.

## Información viva y fuentes verificadas al 12/10/2026
- **MOPT:** https://www.mopt.go.cr/noticias — obras y avisos; las publicaciones recientes muestran afectaciones puntuales en distintos corredores. No es una API universal de ETA.
- **CONAVI:** https://conavi.go.cr/red-vial-mopt — red vial / georreferencia oficial.
- **SINAC:** https://www.sinac.go.cr/ES/resvlinea/Paginas/default.aspx — múltiples modalidades de reserva según parque. No asumir que todo parque se compra por un único canal.
- **ICT:** https://es.visitcostarica.com/things-to-do/ecoturism/national-parks — contexto turístico y conservación.
- **Pulso meteorológico existente:** `backend/weatherPulseService.ts`, con distinción `open-meteo` frente a `fallback`. Un fallback no es observación actual.
- **Futuras verificaciones por viaje:** mapas con rutas efectivas, cierres de MOPT/CONAVI, alertas IMN/CNE, horarios y cupos SINAC, condiciones de mar, ferris, aerolíneas, proveedor y condiciones de acceso 4x4. Sin integraciones reales no etiquetar nada como verificado.

## Fases de JARVIS
**Fase A (este PR):** conocimiento versionado ES/EN, catálogo de fuentes, informe consultivo y contratos de seguridad; integrado en las reglas de inteligencia existentes.

**Fase B:** brief autenticado de propietario que lea métricas reales y dispare alertas de SLA, itinerarios inviables, eventos de proveedor y fuentes caducadas; sin escrituras comerciales automáticas.

**Fase C:** supervisión proactiva y tareas programadas en backend privado con claves de idempotencia, auditoría persistente, permisos mínimos, aprobación y posibilidad de reversión. Herramientas de voz opcionales, nunca por defecto.

**Fase D:** pruebas con usuarios, rutas, proveedores y cobros sandbox; comparar recomendaciones con duración de ruta real y resultados operativos. Despliegue solo tras tests, controles de acceso y validación de negocio.

## Pruebas y definición de terminado
`npm run test:contracts`, `npm run lint`, `npm run build`, CI, control de acceso admin y pruebas de extremo a extremo. Un informe es consultivo mientras no tenga evidencia de ruta, clima, proveedor y disponibilidad. No se atribuirán capacidades de voz, navegación web autónoma, lectura de correo o ejecución comercial a JARVIS sin una integración realmente desplegada y verificada.
