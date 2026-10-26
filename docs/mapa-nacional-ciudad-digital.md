# Mapa nacional de Costa Rica Tours

## Explorador integrado — 26 de octubre de 2026

La ruta `/map` conserva el catálogo y las capas existentes. La interfaz utiliza una barra compacta y un único panel: a la derecha en escritorio y debajo del mapa en móvil. El panel ocupa una celda propia del diseño; no tapa la geografía. Solo se abre una vista de filtros, resultados, ficha, itinerario o calculadora a la vez. Se cierra con X, Escape o pulsando el fondo del mapa.

La dirección visual mantiene los verdes, acentos dorados, tipografía y cabecera de la plataforma. No se agregan dependencias, claves, servicios de pago ni cambios del backend.

### Inventario conservado

Conteo directo de `public/data/mapa/*.geojson` en esta revisión: **25.699 puntos en 14 capas**, además de los tours y los 29 servicios destacados del catálogo existente. El conteo de tours se calcula con los datos recibidos por la pantalla; no está fijado en el componente.

| Capa | Registros | Contenido |
|---|---:|---|
| alimentacion | 8.087 | Sodas, restaurantes y cafés |
| hospedaje | 3.911 | Hoteles, cabinas, hostales, camping y otros alojamientos |
| transporte | 3.666 | Buses, terminales, aeropuertos y pistas |
| salud | 2.404 | Hospitales, clínicas, farmacias y otros centros |
| servicios | 1.861 | Gasolineras, bancos e información turística |
| naturaleza | 1.237 | Playas, cataratas, volcanes, miradores y áreas protegidas |
| emergencia | 903 | Cruz Roja, bomberos y policía |
| cultura | 683 | Museos, teatros, sitios históricos y arte |
| atracciones | 474 | Atracciones turísticas |
| parques_sinac | 62 | Sectores y áreas protegidas compilados de SINAC |
| fauna | 86 | Pasos de fauna y corredores biológicos |
| reforestacion | 50 | Proyectos de reforestación |
| patrimonio | 387 | Patrimonio histórico y sitios UNESCO |
| ccss | 1.888 | Red CCSS; conjunto de datos de 2021 |

No es un censo exhaustivo de todo lo que existe en Costa Rica. La presencia de un punto no verifica operación, acceso, disponibilidad, tarifas, relación comercial ni autorización para reservar. Las capas conservan sus fuentes y limitaciones originales. Los conteos pueden cambiar cuando el proceso de actualización genere un nuevo PR.

### Navegación y filtros

- Seis selecciones rápidas: Explorar, Naturaleza, Dormir y comer, Moverse, Servicios útiles y Todas las capas. La carga inicial muestra tours y la capa SINAC; las demás se descargan al activarlas.
- Cinco familias de capas nacionales, desplegables para revelar solo la información necesaria.
- Búsqueda compartida en las capas activas: normaliza mayúsculas y acentos y exige todos los términos.
- Tipo de lugar para los POI nacionales. Cambiar de selección rápida o restablecer filtros elimina subtipos anteriores.
- Región, categoría, dificultad y duración máxima para el catálogo. Los tours sin duración conocida quedan fuera cuando se exige una duración máxima.
- Área visible y radio de 5/10/25/50/100 km desde el centro del mapa para ambos inventarios. Al desplazar el mapa, se actualizan el centro y los resultados; el radio mide distancia en línea recta.
- Opción de ocultar POI que la fuente marca como aproximados. No convierte referencias de catálogo en coordenadas verificadas.
- Resultados paginados de 40 en 40; los grupos de puntos con una misma referencia también se pueden inspeccionar mediante una lista.
- Tres superficies: calles OpenStreetMap, satélite Esri y relieve OpenTopoMap. Las atribuciones permanecen visibles. Un fallo de teselas muestra una indicación para cambiar de superficie.
- Zonas turísticas orientativas opcionales, desactivadas inicialmente. Los rectángulos heredados no son límites oficiales de provincias ni polígonos de parques. Isla del Coco tiene un acceso específico; el encuadre inicial se adapta al territorio continental y al tamaño de pantalla.
- Se conservan itinerario, calculadora de rutas y tiempos estimados, geolocalización solicitada por el usuario, pantalla completa, consulta de fichas y guardado local del catálogo público.

### Posición, agrupación y precisión

GeoJSON utiliza `[longitud, latitud]`; la conversión a Leaflet `[latitud, longitud]` se valida con `toLeafletLatLng`. No se desplazan coordenadas de origen para separar marcas visualmente.

Tours, servicios del catálogo y POI nacionales comparten una sola agrupación por cuadrículas de píxeles del mundo; no se dibujan grupos independientes que se tapen entre capas. Las celdas vecinas cuyos símbolos se solaparían se fusionan y recalculan antes de dibujar. La agrupación se calcula antes de recortar por la vista: desplazar el mapa no cambia el centro de un grupo. Los símbolos mantienen un tamaño legible al hacer zoom. Los grupos se acercan al pulsarlos; las referencias coincidentes o los grupos a gran aumento abren una lista en el panel. Al máximo aumento se conservan grupos para coordenadas coincidentes o símbolos que todavía se solaparían, de modo que todas las fichas siguen accesibles.

Las marcas individuales conservan su coordenada. Un centroide de grupo representa varios registros, no un negocio. Las fichas de tours y servicios del catálogo muestran que la coordenada es una referencia y piden confirmar el punto de encuentro. Los POI con `aprox: true` se identifican con borde discontinuo y aviso en la ficha; no se inventa una precisión mayor.

`ResizeObserver`, `fullscreenchange` e `invalidateSize({ pan: true, animate: false })` mantienen el centro y las animaciones de destino al sincronizar el tamaño de Leaflet cuando el panel, la cabecera o la pantalla cambian.

### Carga y fallos

La agrupación nacional se calcula en un Web Worker para mantener libres el desplazamiento y los controles. Se reutiliza al desplazar el mapa; un indicador señala los recálculos de zoom o filtros.

`nationalPoiData.ts` conserva los datos correctos en memoria y comparte las solicitudes concurrentes de una misma capa. Valida la colección y descarta geometrías inválidas. Un fallo detiene los reintentos automáticos y ofrece un botón explícito para reintentar; no se crea un bucle de peticiones ni se bloquean las otras capas. El service worker existente conserva su estrategia de caché para GeoJSON.

El guardado manual sin conexión conserva el catálogo público. No garantiza teselas nuevas sin red ni cobertura de capas que nunca se hayan descargado.

### Privacidad y continuidad

Las fichas nacionales reutilizan `nationalPoiPopup.ts`, con las reglas vigentes de ocultación de contactos, enlaces de fuente y datos comerciales del proveedor. La consulta comercial continúa por el flujo interno de Costa Rica Tours. La presencia de un POI no crea un servicio vendible ni una reserva confirmada.

No se modifica `api/[...path].ts`, pagos, reservas del servidor, variables, permisos ni despliegues pausados de GCP. No se habilita el modo de Google Maps ni se incorpora una API de pago. La versión anterior completa de los dos componentes y esta documentación queda en `archive/map-ui-20261026/` como referencia no compilada.

### Validación

- Contratos del repositorio: 958 pruebas aprobadas en la revisión local completa; contratos específicos de búsqueda, área/radio, duración, carga y agrupación ejecutados nuevamente tras los ajustes finales.
- TypeScript sin emisiones y compilación Vite; auditoría de privacidad del bundle público.
- Pruebas E2E de regresión: posición tras zoom, desplazamiento y cambio de tamaño; panel móvil sin superposición; filtros y ficha; superficies e itinerario; fallo de capa y reintento manual. Se ejecutan en el CI del PR con red externa simulada.
- Inspección del build real en navegador: escritorio y marco móvil de 390 × 844. Panel acoplado, búsqueda nacional, ficha de catarata, agrupación y cambio de zoom. En la muestra de marcas visibles a zoom 15, la desviación respecto de Web Mercator fue menor de 1 px.

El marco móvil valida el diseño y la interacción de la página a ese ancho. No sustituye una prueba física de gestos multitáctiles en dispositivos iOS/Android. Los datos antiguos o aproximados siguen requiriendo verificación de campo.

## Actualización de datos

El pipeline existente en `scripts/mapa/` genera las capas OSM/CCSS y normaliza las capas curadas desde `data/fuentes/fase2/`. El workflow `refresh-map-data.yml` propone cambios mediante PR; se conservan los contratos de datos nacionales y prospectos. No se ejecuta una actualización masiva como parte de este cambio de interfaz.

La relación comercial, verificación de operadores y acuerdos se gestionan en el backend existente. No publicar contactos internos en el catálogo, la documentación del cambio ni los logs. Mantener atribución de OpenStreetMap y de los proveedores de superficies.

PMTiles/MapLibre se mantienen como una posible evolución para polígonos oficiales o inventarios mayores. Esta revisión reutiliza Leaflet y los GeoJSON existentes; no dibuja límites oficiales inexistentes.
