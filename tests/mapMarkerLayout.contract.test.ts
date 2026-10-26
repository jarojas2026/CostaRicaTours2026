import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  clusterByGrid,
  coordinateKey,
  groupByCoordinate,
  groupMapPointsAtZoom,
  limitNearestToCenter,
  toLeafletLatLng,
  type LatLngTuple,
} from '../src/utils/mapMarkerLayout.ts';
import { NATIONAL_POI_GROUPS } from '../src/data/nationalPoiLayers.ts';

// Proyección Web Mercator (EPSG:3857) en píxeles del mundo, igual que map.project de Leaflet.
const project = (zoom: number) => (lat: number, lng: number) => {
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return { x: (scale * (lng + 180)) / 360, y: scale * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) };
};

test('GeoJSON [lng, lat] se convierte a Leaflet [lat, lng] (no se invierte)', () => {
  assert.deepEqual(toLeafletLatLng([-84.0907, 9.9281]), [9.9281, -84.0907]);
  assert.equal(toLeafletLatLng([Number.NaN, 9]), null);
  assert.equal(toLeafletLatLng([-200, 9]), null);
});

test('todas las capas nacionales caen en Costa Rica tras la conversión a [lat, lng]', () => {
  for (const group of NATIONAL_POI_GROUPS) {
    const fc = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', group.file), 'utf8'));
    for (const f of fc.features) {
      const ll = toLeafletLatLng(f.geometry.coordinates);
      assert.ok(ll, `${f.properties?.id} sin coordenada válida`);
      const [lat, lng] = ll!;
      // Si alguien invierte el orden, lat quedaría en ~-85 y fallaría aquí.
      assert.ok(lat > 5 && lat < 11.5 && lng > -87.6 && lng < -82.4, `${group.id}/${f.properties?.id} fuera de Costa Rica: ${lat},${lng}`);
    }
  }
});

test('fichas con la misma coordenada forman una sola marca con todas las fichas', () => {
  const items = [
    { id: 'a', ll: [10.895, -84.785] as LatLngTuple },
    { id: 'b', ll: [10.89500001, -84.78500001] as LatLngTuple },
    { id: 'c', ll: [9.149, -83.753] as LatLngTuple },
  ];
  const groups = groupByCoordinate(items, (i) => i.ll);
  assert.equal(groups.length, 2);
  const stack = groups.find((g) => g.items.length === 2)!;
  assert.deepEqual(stack.items.map((i) => i.id).sort(), ['a', 'b']);
  assert.equal(stack.key, coordinateKey(10.895, -84.785));
});

test('un punto solo conserva su coordenada exacta; el grupo usa centroide y se marca como agrupación', () => {
  const items: LatLngTuple[] = [[9.9, -84.1], [9.9005, -84.1005], [10.6, -85.4]];
  const clusters = clusterByGrid(items, (i) => i, project(8), 64);
  const single = clusters.find((c) => c.count === 1)!;
  assert.equal(single.isCluster, false);
  assert.deepEqual([single.lat, single.lng], [10.6, -85.4]);
  const grouped = clusters.find((c) => c.count === 2)!;
  assert.equal(grouped.isCluster, true);
  assert.ok(Math.abs(grouped.lat - 9.90025) < 1e-9 && Math.abs(grouped.lng + 84.10025) < 1e-9);
});

test('la agrupación no depende del orden ni del encuadre (estable al desplazar el mapa)', () => {
  const items: LatLngTuple[] = Array.from({ length: 200 }, (_, i) => [8.5 + (i % 20) * 0.1, -85.5 + Math.floor(i / 20) * 0.2]);
  const a = clusterByGrid(items, (i) => i, project(9), 64).map((c) => `${c.lat.toFixed(6)},${c.lng.toFixed(6)},${c.count}`).sort();
  const b = clusterByGrid([...items].reverse(), (i) => i, project(9), 64).map((c) => `${c.lat.toFixed(6)},${c.lng.toFixed(6)},${c.count}`).sort();
  assert.deepEqual(a, b);
});

test('el tope de 5.000 puntos prioriza los más cercanos al centro y avisa del recorte', () => {
  const items: LatLngTuple[] = Array.from({ length: 6000 }, (_, i) => [8 + (i % 100) * 0.03, -86 + Math.floor(i / 100) * 0.06]);
  const center: LatLngTuple = [9.5, -84.2];
  const { shown, total, truncated } = limitNearestToCenter(items, (i) => i, center, 5000);
  assert.equal(shown.length, 5000);
  assert.equal(total, 6000);
  assert.equal(truncated, true);
  const d = (p: LatLngTuple) => (p[0] - center[0]) ** 2 + ((p[1] - center[1]) * Math.cos((((p[0] + center[0]) / 2) * Math.PI) / 180)) ** 2;
  const maxShown = Math.max(...shown.map(d));
  const shownSet = new Set(shown);
  const minHidden = Math.min(...items.filter((p) => !shownSet.has(p)).map(d));
  assert.ok(maxShown <= minHidden + 1e-9, 'se descartó un punto más cercano que uno mostrado');
  assert.equal(limitNearestToCenter(items.slice(0, 10), (i) => i, center, 5000).truncated, false);
});

test('los marcadores del mapa usan iconAnchor en el centro exacto de iconSize', () => {
  const sources = ['src/components/InteractiveMap.tsx', 'src/components/NationalPoiLayer.tsx'].map((f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8'));
  for (const src of sources) {
    const re = /iconSize:\s*\[([^,\]]+),\s*([^\]]+)\],\s*iconAnchor:\s*\[([^,\]]+),\s*([^\]]+)\]/g;
    let m: RegExpExecArray | null;
    let found = 0;
    while ((m = re.exec(src))) {
      found += 1;
      const [w, h, ax, ay] = m.slice(1).map((s) => s.trim());
      const half = (v: string) => (/^\d+$/.test(v) ? String(Number(v) / 2) : `${v} / 2`);
      assert.equal(ax, half(w), `iconAnchor x ${ax} no es la mitad de ${w}`);
      assert.equal(ay, half(h), `iconAnchor y ${ay} no es la mitad de ${h}`);
    }
    assert.ok(found > 0);
  }
});

test('el mapa recalcula su tamaño con ResizeObserver (no solo con window.resize)', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/components/InteractiveMap.tsx'), 'utf8');
  assert.match(src, /new ResizeObserver\(/);
  assert.match(src, /invalidateSize\(/);
  assert.match(src, /fullscreenchange/);
});


test('zoom-aware map groups nearby tours only at low zoom, without replacing source coordinates', () => {
  const tours = [
    { id: 'arenal1', ll: [10.4678, -84.6427] as LatLngTuple },
    { id: 'arenal2', ll: [10.4700, -84.6410] as LatLngTuple },
    { id: 'tamarindo', ll: [10.30, -85.84] as LatLngTuple }
  ];
  const before = tours.map(t => [...t.ll]);
  const distant = groupMapPointsAtZoom(tours, tour => tour.ll, project(8), 8);
  assert.equal(distant.length, 2, 'two near Arenal reference markers should be one cluster when zoomed out');
  const nearGroup = distant.find(g => g.items.length === 2)!;
  assert.equal(nearGroup.isCluster, true, 'centroid must not be presented as a precise place');
  const close = groupMapPointsAtZoom(tours, tour => tour.ll, project(15), 15);
  assert.equal(close.length, 3, 'zooming in must restore original separate references');
  assert.equal(close.every(g => !g.isCluster), true);
  assert.deepEqual(tours.map(t => t.ll), before, 'grouping cannot change stored geocoordinates');
});

test('identical zone reference points remain an accessible count at high zoom', () => {
  const areas = [
    { id: 'a', ll: [10.895, -84.785] as LatLngTuple },
    { id: 'b', ll: [10.895, -84.785] as LatLngTuple }
  ];
  const highZoom = groupMapPointsAtZoom(areas, s => s.ll, project(16), 16);
  assert.equal(highZoom.length, 1);
  assert.equal(highZoom[0].items.length, 2);
  assert.equal(highZoom[0].isCluster, false);
});

test('map clusters the combined inventory and exposes zoom drilldown', () => {
  const mapCode = fs.readFileSync('src/components/InteractiveMap.tsx', 'utf8');
  assert.match(mapCode, /groupMapPointsAtZoom\(mapItems,/);
  assert.match(mapCode, /renderMarkers=\{false\}/);
  assert.match(mapCode, /effectiveTours\.map/);
  assert.match(mapCode, /effectiveServices\.map/);
  assert.match(mapCode, /poiResults\.map/);
  assert.match(mapCode, /setSelectedGroup/);
  assert.match(mapCode, /mapReferenceLabel/);
  assert.doesNotMatch(mapCode, /\.bindPopup\(/, 'catalog details and groups must use the reserved dock instead of map popups');
  assert.match(mapCode, /new ResizeObserver\(/);
});


test('clusters from adjacent cells merge when their symbols would overlap', () => {
  const items=[{id:'tour',ll:[1,63] as LatLngTuple},{id:'hotel',ll:[1,65] as LatLngTuple},{id:'poi',ll:[1,180] as LatLngTuple}];
  const before=items.map(i=>[...i.ll]);
  const groups=groupMapPointsAtZoom(items,i=>i.ll,(lat,lng)=>({x:lng,y:lat}),8);
  assert.equal(groups.length,2);
  assert.equal(groups.find(g=>g.count===2)!.items.length,2);
  assert.deepEqual(items.map(i=>i.ll),before);
  assert.equal(groups.reduce((n,g)=>n+g.count,0),3);
});
