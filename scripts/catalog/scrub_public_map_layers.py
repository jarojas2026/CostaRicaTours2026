"""Quita de las capas públicas del mapa (public/data/mapa/*.geojson) los puntos que
identifican a un operador/proveedor del catálogo (por nombre o dominio web), y sus
contactos. Decisión del negocio: el cliente no ve proveedores antes de reservar.

Usa data/internal/operatorDenylist.json (generado por build_operator_tours.py).
Uso: python3 scripts/catalog/scrub_public_map_layers.py
"""
import json, pathlib, re, unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[2]
DENY = json.loads((ROOT / 'data/internal/operatorDenylist.json').read_text(encoding='utf-8'))
ACC = {'a': '[aáàä]', 'e': '[eéèë]', 'i': '[iíìï]', 'o': '[oóòö]', 'u': '[uúùü]', 'n': '[nñ]'}


def pat(a):
    b = unicodedata.normalize('NFKD', a).encode('ascii', 'ignore').decode()
    if len(b) != len(a):
        return re.escape(a)
    return ''.join((ACC[c.lower()] if c == c.lower() else ACC[c.lower()].upper()) if c.lower() in ACC else re.escape(c) for c in b)


NAMES = [re.compile(r'(?<![\w])' + pat(n) + r'(?![\w])') for n in DENY['names']]
DOMAINS = [d.lower() for d in DENY['domains']]


def has_domain(text):
    low = text.lower()
    return any(d in low for d in DOMAINS)


def is_operator(props):
    text = ' '.join(str(v) for v in props.values() if isinstance(v, str)) + ' ' + json.dumps(props, ensure_ascii=False)
    return any(rx.search(text) for rx in NAMES) or has_domain(text)


# Capas de negocios: el punto de un operador se retira. Capas de lugares (naturaleza,
# patrimonio, salud, emergencias...): la ubicación sigue visible (decisión del dueño),
# solo se quitan web/teléfono/correo cuando identifican a un operador.
BUSINESS_LAYERS = {'atracciones', 'hospedaje', 'alimentacion', 'servicios', 'transporte', 'cultura'}
CONTACT_KEYS = ('web', 'website', 'telefono', 'phone', 'email', 'correo', 'whatsapp', 'contact')

removed_total = stripped_total = 0
for path in sorted((ROOT / 'public/data/mapa').glob('*.geojson')):
    data = json.loads(path.read_text(encoding='utf-8'))
    kept, removed, stripped = [], 0, 0
    for f in data['features']:
        props = f.get('properties') or {}
        if not is_operator(props):
            kept.append(f); continue
        if path.stem in BUSINESS_LAYERS:
            removed += 1; continue
        for k in [k for k in props if k.lower() in CONTACT_KEYS or k.lower().startswith('contact')
                  or (isinstance(props[k], str) and has_domain(props[k]))]:
            del props[k]; stripped += 1
        for k, v in list(props.items()):
            if isinstance(v, list):  # filas {es, en, v} (p. ej. "Contacto")
                keep = [x for x in v if not (isinstance(x, dict) and (has_domain(json.dumps(x, ensure_ascii=False))
                        or str(x.get('es', '')).lower().startswith('contacto')))]
                stripped += len(v) - len(keep); props[k] = keep
        kept.append(f)
    if removed or stripped:
        data['features'] = kept
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        print(f'{path.name}: -{removed} puntos, -{stripped} contactos')
    removed_total += removed; stripped_total += stripped
print(f'puntos de operador retirados: {removed_total}; contactos retirados: {stripped_total}')
