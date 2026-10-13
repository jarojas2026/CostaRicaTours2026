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
python3 scripts/export_osm_layers.py   # escribe public/data/mapa/*.geojson
```
Recomendado: mensual.

## Fase 2 — vacíos y fuente oficial para cada uno
- Pasos de fauna: no existen en OSM → SINAC / MOPT (CONAVI) / iniciativas de pasos de fauna.
- Proyectos de reforestación: FONAFIFO (Pago por Servicios Ambientales), SINAC.
- Tarifas, cupos, horarios y reservas de parques nacionales: SINAC (campos `officialPriceUSD`, `dailyQuota`, `sinacBookingUrl` ya existen en `MapTourismService`).
- Empresas con declaratoria turística y CST: ICT.
- EBAIS y áreas de salud oficiales: CCSS.
- Patrimonio histórico-arquitectónico declarado: Ministerio de Cultura y Juventud (Centro de Patrimonio).
- Teléfonos/horarios faltantes: Google Places API (requiere clave y tiene costo por consulta; mantener la clave en el backend).

## Fase 3 — de punto a servicio vendible
Unir cada POI con operadores y servicios (tours, transporte, alimentación, hospedaje, guías, asesoría, entradas) para que el punto se pueda reservar desde la ficha (`MapServiceBookingModal`).
