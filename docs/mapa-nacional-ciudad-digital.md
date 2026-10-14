# Mapa nacional de la Ciudad Digital — Todo Costa Rica

## Qué incluye esta versión (fase 1)
23.293 puntos reales con coordenadas, en 9 capas (`public/data/mapa/*.geojson`), extraídos de OpenStreetMap (extracto Geofabrik, octubre 2026):

| Capa | Puntos | Contenido |
|---|---|---|
| alimentacion | 8.096 | Sodas (783 con "Soda" en el nombre), restaurantes, cafés |
| hospedaje | 3.934 | Hoteles, cabinas, hostales, apartamentos, camping |
| transporte | 3.667 | Paradas de bus, 502 terminales, 86 aeropuertos y pistas |
| salud | 2.404 | 119 hospitales, clínicas/EBAIS, farmacias |
| servicios | 1.865 | Gasolineras, bancos/cajeros, información turística |
| naturaleza | 1.237 | 203 áreas protegidas/parques, 237 cataratas, 442 playas, 35 volcanes, miradores |
| emergencia | 903 | 134 Cruz Roja, bomberos, policía |
| cultura | 684 | 68 museos, 82 teatros, sitios históricos, arte |
| atracciones | 503 | Atracciones, zoológicos, parques temáticos |

Unos 2.000 puntos tienen teléfono publicado.

## Cómo funciona en el mapa
- Componente `src/components/NationalPoiLayer.tsx`, montado en `InteractiveMap.tsx` (modo Leaflet).
- Botón "Todo Costa Rica" abajo a la izquierda: activar/desactivar capas y buscar por nombre o tipo.
- Cada capa se descarga solo al activarla (carga diferida, caché en memoria).
- Zoom < 13: agrupación por cuadrícula (clusters con conteo; clic = acercar). Zoom ≥ 13: puntos individuales en canvas con ficha (tipo, nombre, dirección, teléfono, horario, web, "Cómo llegar").
- Sin dependencias nuevas.
- Atribución ODbL obligatoria: "© colaboradores de OpenStreetMap" (ya incluida en fichas y panel).

## Actualizar los datos
```bash
curl -LO https://download.geofabrik.de/central-america/costa-rica-latest.osm.pbf
pip install osmium
python3 scripts/mapa/export_osm_layers.py   # escribe public/data/mapa/*.geojson
```
Recomendado: mensual.

## Fase 2 — capas oficiales (integradas, octubre 2026)
| Capa | Puntos | Fuente |
|---|---|---|
| parques_sinac | 62 sectores de 42 áreas | Páginas oficiales SINAC; tarifas extranjero/nacional, horario, días cerrado, cupo, enlace de reserva (serviciosenlinea.sinac.go.cr) |
| fauna | 48 pasos de fauna (~448 estructuras) + 38 corredores biológicos | MOPT/CONAVI, BID (osf.io/6fe83), SINAC 2008, ONG (KSTR, Jaguar Rescue, Osa Conservation…) |
| reforestacion | 50 proyectos | Sitio de cada proyecto; 29 permiten visitar o participar |
| patrimonio | 387 (378 inmuebles declarados + 9 UNESCO/arqueológicos) | Lista compilada del MCJ, UNESCO, Wikidata |
| ccss | 1.888 (EBAIS, áreas de salud, hospitales) | CCSS SGIS (datos 2021) |

Las fichas muestran "Ubicación aproximada" cuando el punto es de distrito, poblado o centroide.

### Pendientes conocidos
- Corredores: la capa vigente (54 corredores) está en SNIT `https://geos1pne.sirefor.go.cr/wfs` capa `PNE:corredoresbiologicos` (no respondió).
- Pasos de fauna: no existe inventario nacional público con ubicaciones (MOPT reporta 98).
- Patrimonio: el sitio oficial inmuebles.patrimonio.go.cr bloquea acceso automatizado; faltan declaratorias posteriores a 2021.
- CCSS: datos de 2021; faltan teléfonos en ~1.000 puntos.
- No usar sinac-cr.com: no es oficial.
- Empresas con declaratoria ICT: sin registro público consultable.

## Fase 3 — de punto a servicio vendible
Unir cada POI con operadores y servicios (tours, transporte, alimentación, hospedaje, guías, asesoría, entradas) para que el punto se pueda reservar desde la ficha (`MapServiceBookingModal`).


## Fase 3 — datos como código (octubre 2026)
- **Pipeline reproducible**: `scripts/mapa/` (`export_osm_layers.py`, `fetch_ccss.py`, `normalize_fase2.py`). Las capas curadas de la fase 2 viven en `data/fuentes/fase2/*.geojson` y se normalizan a `public/data/mapa/`.
- **Actualización automática**: `.github/workflows/refresh-map-data.yml` corre cada lunes (y a demanda), regenera OSM y CCSS, valida y abre un PR solo si hay cambios.
- **Validación**: `tests/nationalMapData.contract.test.ts` (todas las capas: puntos dentro de Costa Rica, ids únicos, enlaces de reserva solo oficiales) y `tests/operatorProspects.contract.test.ts`.
- **Offline / móvil**: el service worker (Workbox) guarda las capas con *stale-while-revalidate*: abren al instante y funcionan sin señal.
- **Operadores**: `data/operators/operatorProspects.{json,ts}` (fuera de `src/`, no entra al bundle) — 50 prospectos tipados y validados en tiempo de ejecución, con `verification` y `partnershipStatus`. `getSellableOperators()` solo devuelve operadores verificados con acuerdo firmado (hoy ninguno).
- **Teselas vectoriales (PMTiles)**: evaluadas y descartadas por ahora. Con ~26.000 puntos, las capas ya viajan comprimidas con Brotli (la más grande ≈230 KB gzip) y la búsqueda nacional necesita los datos completos. Conviene adoptarlas cuando se agreguen polígonos (límites de parques, corredores) o se pase a MapLibre.
