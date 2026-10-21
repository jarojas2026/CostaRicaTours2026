# Normaliza las fuentes curadas de data/fuentes/fase2 (+ CCSS) a public/data/mapa/*.geojson.
# Uso: python3 scripts/mapa/fetch_ccss.py && python3 scripts/mapa/normalize_fase2.py
# Después SIEMPRE: python3 scripts/catalog/strip_public_business_contacts.py (sin contactos de negocios en datos públicos).
import json, os
import sys, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
SRC=ROOT/'data/fuentes/fase2'
OUT=str(ROOT/'public/data/mapa')
def load(f): return json.load(open(SRC/f))['features']
def s(v):
    if v is None: return ''
    if isinstance(v,bool): return 'Sí' if v else 'No'
    if isinstance(v,float) and v.is_integer(): v=int(v)
    v=str(v).strip()
    return '' if v.upper() in ('NO TIENE','NONE','NULL','N/A') else v
def det(*pairs):
    return [{'es':a,'en':b,'v':s(v)} for a,b,v in pairs if s(v)]
def feat(f,grupo,i,props):
    lng,lat=f['geometry']['coordinates'][:2]
    p={k:v for k,v in props.items() if v not in ('',None,[],False)}
    p['id']=f'{grupo}-{i}'; p['grupo']=grupo
    return {'type':'Feature','geometry':{'type':'Point','coordinates':[round(lng,6),round(lat,6)]},'properties':p}
def isaprox(cp): 
    cp=s(cp).lower(); return any(w in cp for w in ('aprox','centroide','poblado','localidad','distrito','cantón','canton','región','region'))
def url(v):
    v=s(v); return v if v.startswith('http') else ''
out={}
# SINAC
L=[]
for i,f in enumerate(load('sinac_parques.geojson')):
    p=f['properties']
    nom=p['nombre']+(f" · {p['sector']}" if s(p.get('sector')) else '')
    usd=s(p.get('tarifa_extranjero_usd')); crc=s(p.get('tarifa_nacional_crc'))
    iva=' (IVA incl.)' if p.get('tarifa_iva_incluido') else ' (sin IVA)'
    L.append(feat(f,'parques_sinac',i,{'tipo':p['tipo'],'nombre':nom,'telefono':s(p.get('telefono')),'horario':s(p.get('horario')),'reserva':url(p.get('url_reserva')),'aprox':isaprox(p.get('coord_precision')),'fuente':s(p.get('fuente')).split(' ')[0],
      'detalles':det(('Tarifa extranjero','Foreign visitor fee',f'USD {usd}{iva}' if usd else ''),('Tarifa nacional','Resident fee',f'₡{crc}{iva}' if crc else ''),('Días cerrado','Closed on',p.get('dias_cerrado')),('Cupo diario','Daily quota',p.get('cupo_diario')),('Reserva','Booking',p.get('requiere_reserva')),('Área de conservación','Conservation area',p.get('area_conservacion')),('Notas','Notes',p.get('notas')))}))
out['parques_sinac']=L
# fauna
L=[]
for i,f in enumerate(load('pasos_fauna.geojson')):
    p=f['properties']
    L.append(feat(f,'fauna',i,{'tipo':'Paso de fauna','nombre':p['nombre'],'direccion':s(p.get('ruta_o_lugar')),'aprox':isaprox(p.get('coord_precision')),'fuente':s(p.get('fuente')).split(' ')[0],
      'detalles':det(('Tipo de paso','Crossing type',p.get('tipo_paso')),('Especies','Target species',p.get('especies_objetivo')),('Responsable','Managed by',p.get('responsable')),('Año','Year',p.get('año')),('Cantidad de estructuras','Structures',p.get('cantidad')),('Estado','Status',p.get('estado')))}))
for j,f in enumerate(load('corredores_biologicos.geojson')):
    p=f['properties']; ha=s(p.get('area_ha_aprox'))
    L.append(feat(f,'fauna',1000+j,{'tipo':'Corredor biológico','nombre':p['nombre'],'aprox':True,'fuente':s(p.get('fuente')),
      'detalles':det(('Área de conservación','Conservation area',p.get('area_conservacion')),('Superficie aprox.','Approx. area',f'{int(float(ha)):,} ha'.replace(',','.') if ha else ''))}))
out['fauna']=L
# reforestacion
L=[]
for i,f in enumerate(load('reforestacion.geojson')):
    p=f['properties']; c=s(p.get('contacto'))
    web=next((w for w in c.replace(';',' ').replace(',',' ').split() if w.startswith('http')),'')
    L.append(feat(f,'reforestacion',i,{'tipo':'Proyecto de reforestación','nombre':p['nombre'],'direccion':s(p.get('region_provincia')),'web':web,'aprox':isaprox(p.get('coord_precision')),'fuente':s(p.get('fuente')).split(' ')[0],
      'detalles':det(('Organización','Organization',p.get('organizacion')),('Tipo','Type',p.get('tipo_proyecto')),('¿Se puede participar?','Can you join?',p.get('detalle_participacion') or p.get('se_puede_visitar_o_participar')),('Contacto','Contact',c))}))
out['reforestacion']=L
# patrimonio
L=[]
for i,f in enumerate(load('patrimonio.geojson')):
    p=f['properties']
    tipo=s(p.get('tipo')); tipo=tipo[:1].upper()+tipo[1:]
    dirc=', '.join(x for x in [s(p.get('distrito')),s(p.get('canton')),s(p.get('provincia'))] if x)
    L.append(feat(f,'patrimonio',i,{'tipo':tipo,'nombre':p['nombre'],'direccion':dirc,'aprox':isaprox(p.get('coord_precision')),'fuente':s(p.get('fuente')).split(' ')[0],
      'detalles':det(('Descripción','Description',p.get('descripcion_breve')),('Declaratoria','Declaration',p.get('decreto')),('Año','Year',p.get('anio_declaratoria')),('Época','Period',p.get('epoca_constructiva')),('Nota','Note',p.get('fuente_nota') if 'demol' in s(p.get('fuente_nota')).lower() or 'incend' in s(p.get('fuente_nota')).lower() else ''))}))
out['patrimonio']=L
# ccss
L=[]
for i,f in enumerate(load('ccss_salud.geojson')):
    p=f['properties']
    L.append(feat(f,'ccss',i,{'tipo':p['tipo'],'nombre':s(p['nombre']).title(),'telefono':s(p.get('telefono')),'direccion':s(p.get('direccion')),'fuente':'https://www.ccss.sa.cr',
      'detalles':det(('Área de salud','Health area',p.get('area_salud')),('Región CCSS','CCSS region',p.get('region')))}))
out['ccss']=L
attr={'parques_sinac':'SINAC (sinac.go.cr), octubre 2026','fauna':'MOPT/CONAVI, BID (osf.io/6fe83), SINAC 2008, ONG locales','reforestacion':'Sitios oficiales de cada proyecto, octubre 2026','patrimonio':'Ministerio de Cultura y Juventud (lista compilada), UNESCO, Wikidata; ubicaciones © OpenStreetMap','ccss':'CCSS – Mapa de Establecimientos (SGIS, datos 2021)'}
for g,L in out.items():
    json.dump({'type':'FeatureCollection','attribution':attr[g],'features':L},open(f'{OUT}/{g}.geojson','w'),ensure_ascii=False,separators=(',',':'))
    print(g,len(L),os.path.getsize(f'{OUT}/{g}.geojson'))
