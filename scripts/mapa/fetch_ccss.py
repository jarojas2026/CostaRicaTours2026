# Descarga la red de establecimientos de salud de la CCSS (capa pública ArcGIS exportada del SGIS de la CCSS)
# y la guarda en data/fuentes/fase2/ccss_salud.geojson. Excluye sucursales financieras.
import json, pathlib, urllib.request, urllib.parse
ROOT = pathlib.Path(__file__).resolve().parents[2]
URL = 'https://services.arcgis.com/LjCtRQt1uf8M6LGR/arcgis/rest/services/Mapa_Establecimientos_y_Sectores_CCSS_WFL1/FeatureServer/0/query'
TIPOS = {
    'EBAIS': 'EBAIS (sede de EBAIS)',
    'PVP': 'Puesto de visita periódica',
    'SEDES DE AREAS DE SALUD': 'Sede de Área de Salud',
    'HOSPITALES': 'Hospital',
    'CENTRO ESPECIALIZADO': 'Centro especializado',
    'DIRECCION DE RED INTEGRADA DE PRESTACIÓN DE LOS SERVICIOS DE SALUD': 'Dirección regional (DRIPSS, administrativa)',
}
feats, offset = [], 0
while True:
    q = urllib.parse.urlencode({'where': '1=1', 'outFields': '*', 'outSR': 4326, 'f': 'geojson', 'resultOffset': offset, 'resultRecordCount': 1000})
    with urllib.request.urlopen(f'{URL}?{q}', timeout=60) as r:
        page = json.load(r)['features']
    if not page:
        break
    for f in page:
        p = f['properties']
        if p.get('tipo_establecimiento') != 'De Salud' or not f.get('geometry'):
            continue
        cat = p.get('Establecimientos_CATEGORIA') or ''
        lng, lat = f['geometry']['coordinates'][:2]
        feats.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [lng, lat]}, 'properties': {
            'grupo': 'salud', 'tipo': TIPOS.get(cat, cat.title()), 'categoria_ccss': cat,
            'nombre': p.get('Establecimientos_NOMBRE'), 'codigo_ccss': p.get('Establecimientos_CODIGO'),
            'area_salud': p.get('area_salud'), 'region': p.get('Region'), 'provincia': p.get('provincia'),
            'canton': p.get('canton'), 'distrito': p.get('distrito'), 'direccion': p.get('sgis_SGIS_IMPORT_SABANA_DIRECCI'),
            'telefono': p.get('Establecimientos_TELEFONO'), 'coord_precision': 'source (CCSS SGIS export)', 'fuente': URL.rsplit('/query', 1)[0]}})
    offset += len(page)
if len(feats) < 1500:
    raise SystemExit(f'CCSS devolvió solo {len(feats)} establecimientos; se conserva el archivo anterior.')
out = ROOT / 'data/fuentes/fase2/ccss_salud.geojson'
json.dump({'type': 'FeatureCollection', 'features': feats}, open(out, 'w'), ensure_ascii=False)
print('CCSS', len(feats))
