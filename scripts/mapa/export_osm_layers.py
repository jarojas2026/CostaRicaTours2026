# Genera public/data/mapa/*.geojson desde el extracto OSM de Costa Rica.
# Uso: curl -LO https://download.geofabrik.de/central-america/costa-rica-latest.osm.pbf
#      pip install osmium && python3 scripts/mapa/export_osm_layers.py
# Datos © colaboradores de OpenStreetMap, licencia ODbL (atribución obligatoria).
import osmium, json, collections, os
def cat(t):
    a=t.get('amenity');tr=t.get('tourism');n=t.get('name','').lower()
    if 'cruz roja' in (n+t.get('operator','').lower()): return 'emergencia','Cruz Roja'
    if a=='hospital': return 'salud','Hospital'
    if a in('clinic','doctors'): return 'salud','Clínica / EBAIS'
    if a=='pharmacy': return 'salud','Farmacia'
    if a=='fire_station': return 'emergencia','Bomberos'
    if a=='police': return 'emergencia','Policía'
    if t.get('boundary') in('protected_area','national_park') or t.get('leisure')=='nature_reserve': return 'naturaleza','Área protegida'
    if t.get('natural')=='volcano': return 'naturaleza','Volcán'
    if t.get('waterway')=='waterfall': return 'naturaleza','Catarata'
    if t.get('natural')=='beach': return 'naturaleza','Playa'
    if tr=='viewpoint': return 'naturaleza','Mirador'
    if tr=='museum': return 'cultura','Museo'
    if a=='theatre': return 'cultura','Teatro'
    if 'historic' in t: return 'cultura','Sitio histórico'
    if tr in('gallery','artwork'): return 'cultura','Arte / galería'
    if tr in('attraction','zoo','theme_park','aquarium'): return 'atracciones','Atracción'
    if tr=='information': return 'servicios','Información turística'
    if a in('restaurant','fast_food','cafe','food_court'): return 'alimentacion','Soda' if 'soda' in n else 'Restaurante / café'
    if tr in('hotel','motel','guest_house','hostel','apartment','chalet','camp_site','resort'): return 'hospedaje',tr
    if a=='bus_station': return 'transporte','Terminal de bus'
    if t.get('aeroway') in('aerodrome','airstrip'): return 'transporte','Aeropuerto / pista'
    if a=='fuel': return 'servicios','Gasolinera'
    if a in('bank','atm'): return 'servicios','Banco / cajero'
    if t.get('highway')=='bus_stop': return 'transporte','Parada de bus'
    return None
feats=collections.defaultdict(list)
def add(t,lat,lon,oid):
    r=cat(t)
    if not r or lat is None: return
    if not (5.0 <= lat <= 11.3 and -87.6 <= lon <= -82.4): return  # fuera de Costa Rica (incluye Isla del Coco y Montes Submarinos)
    g,s=r
    p={'id':oid,'grupo':g,'tipo':s,'nombre':t.get('name',''),'telefono':t.get('phone',t.get('contact:phone','')),'web':t.get('website',t.get('contact:website','')),'horario':t.get('opening_hours',''),'direccion':' '.join(x for x in [t.get('addr:street',''),t.get('addr:city','')] if x)}
    p={k:v for k,v in p.items() if v}
    feats[g].append({'type':'Feature','geometry':{'type':'Point','coordinates':[round(lon,6),round(lat,6)]},'properties':p})
class H(osmium.SimpleHandler):
    def node(self,o):
        t={k.k:k.v for k in o.tags}
        if t: add(t,o.location.lat,o.location.lon,f'n{o.id}')
    def area(self,o):
        t={k.k:k.v for k in o.tags}
        if not t or not cat(t): return
        pts=[]
        for ring in o.outer_rings():
            pts+=[(n.lat,n.lon) for n in ring]
        if pts: add(t,sum(p[0] for p in pts)/len(pts),sum(p[1] for p in pts)/len(pts),('w' if o.from_way() else 'r')+str(o.orig_id()))
H().apply_file(os.environ.get("PBF","costa-rica-latest.osm.pbf"),locations=True)
out=os.environ.get("OUT_DIR","public/data/mapa")
os.makedirs(out,exist_ok=True)
tot=0
for g,f in feats.items():
    json.dump({'type':'FeatureCollection','attribution':'© OpenStreetMap contributors, ODbL','features':f},open(f'{out}/{g}.geojson','w'),ensure_ascii=False)
    tot+=len(f); print(g,len(f), sum(1 for x in f if 'telefono' in x['properties']))
print('total',tot)
