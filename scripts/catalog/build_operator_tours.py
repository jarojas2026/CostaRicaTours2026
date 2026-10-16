"""Convierte los CSV de investigación (data/fuentes/catalogo/*.csv, ver SPEC.md) en DOS archivos:

1. src/data/catalogTours.json  (PÚBLICO, entra al bundle del cliente)
   Sin ningún dato que identifique al operador: ni nombre, ni web, ni enlace de fuente,
   ni contactos, ni la fuente del precio. Ids/slugs neutrales derivados del título.
2. data/internal/operatorTourSources.json  (INTERNO, solo servidor; no se importa desde src/
   y no está en public/). Relaciona cada id público con su operador, url de la fuente,
   contactos conocidos (data/operators/operatorProspects.json) y el origen del precio.
   Lo usa el backend para asignar leads a operadores y el panel /admin (protegido).

Además genera data/internal/operatorDenylist.json (nombres, alias y dominios de operadores)
que usan los contract tests y scripts/auditOperatorPrivacy.mjs para impedir que el bundle
público o los endpoints públicos filtren proveedores, y data/internal/legacyTourIds.json
(id viejo -> id nuevo, para los redirects 301 de vercel.json).

Uso: python3 scripts/catalog/build_operator_tours.py [dir_csv]   (o npm run catalog:build)
Solo usa precios publicados por el operador en su propia página (url_fuente).
Incluye automáticamente cualquier CSV nuevo del directorio (tandas futuras).
"""
import csv, json, re, sys, pathlib, unicodedata
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data/fuentes/catalogo'
PUBLIC_OUT = ROOT / 'src/data/catalogTours.json'
INTERNAL_DIR = ROOT / 'data/internal'
INTERNAL_OUT = INTERNAL_DIR / 'operatorTourSources.json'
DENYLIST_OUT = INTERNAL_DIR / 'operatorDenylist.json'
LEGACY_OUT = INTERNAL_DIR / 'legacyTourIds.json'
PROSPECTS = ROOT / 'data/operators/operatorProspects.json'
PRICE_CHECKED_AT = '2026-10-14'

# Mismo operador y producto que un tour ya existente en toursCatalog.ts
SKIP = {
    'guachipelin-one-day-adventure-pass': 'guanacaste-rincon-adventure-combo',
    'diamante-adventure-pass': 'guanacaste-ocean-view-adventure',
    'marlindelrey-catamaran-tamarindo': 'guanacaste-sunset-catamaran',
    'puretrek-canyoning': 'arenal-waterfall-canyoning',
    'aventura-canopy-monteverde': 'monteverde-superman-zipline',
    'don-juan-3en1-cafe-chocolate-cana': 'coffee-chocolate-tour',
}
NO_HTTPS = ('terraventuras.com',)  # sitios sin HTTPS (verificado 2026-10-14)
GROUP_PRICE = re.compile(r'por bote|per boat|por grupo|per group', re.I)

# Nombres de operadores que también son lugares públicos (reservas, refugios, museos
# públicos, marinas usadas como punto de encuentro, cataratas/cavernas por su nombre
# geográfico). La ubicación y el punto de encuentro siguen visibles (decisión del dueño).
PUBLIC_PLACE_NAMES = {
    'Cataratas Nauyaca', 'Museos del Banco Central', 'Marina Pez Vela', 'Marina Bahía Golfito',
    'Reserva Biológica Bosque Nuboso Monteverde', 'Reserva Bosque Nuboso Santa Elena',
    'Refugio de Vida Silvestre Monteverde', 'Cavernas del Venado', 'Catarata Del Toro',
}
# Alias de marca adicionales (productos o nombres cortos que identifican al operador).
EXTRA_ALIASES = [
    'Desafío', 'Desafio', 'Pure Trek', 'PureTrek', 'Sky Adventures', 'Sky Trek', 'Sky Tram', 'Sky Walk',
    'Selvatura', 'Mawamba', 'Hacienda Doka', 'Doka Estate', 'Don Lulo',
    'Psycho Tours', 'Böëna', 'Boena', 'manptours', 'Café Britt', 'Cafe Britt', 'Britt Coffee', 'Interbus',
    'Iguana Tours', 'Ocean King', 'Wave Expeditions', 'Expediciones Tropicales', 'ALSAMA', 'Alsama Tours',
    'Gray Line', 'Swiss Travel', 'Ríos Tropicales', 'Rios Tropicales', 'Aggressor', 'Okeanos',
    'Diamante Eco Adventure', 'Marlin del Rey', '100% Aventura', 'Bay Island Cruises', 'Mistico Park',
    'Místico Arenal', 'Planet Dolphin', 'Drake Divers', 'Jacamar', 'Pachira Lodge', 'Tortuga Lodge',
    'Caribe Shuttle', "Willie's Tours", 'Terraventuras', 'Life Monteverde', 'Golden Bean',
    'Blue Falls of Costa Rica', 'Damas Island Tours', 'Místico', 'Mistico', 'Curi-Cancha', 'Treetopia',
    'Tree Tram', 'Finca Verde', 'Don Emilio', 'Batsú', 'Batsu', 'Montaña Sagrada',
    'Stibrawpa', 'Doka', 'Little Waves', 'Okeanos Aggressor II', 'Coopelesca', "Bua' Bua'ë", 'Rony Mendoza',
    'Lost Canyon', 'Gravity Falls', 'Cocos Island Aggressor', 'Manuel Antonio ATV Adventure', 'Mishka Kapuk',
    'Trogón Lodge', 'Mountain Top Park', 'Proyecto Asís', 'Hacienda Barú', 'Copa de Árbol', 'Sambola',
    'Ara Manzanillo', 'Jaguar Rescue', 'Kinkajou', 'Bat Jungle', 'Original Canopy', 'Crocodile Man',
    'Don Lucas', 'Rainforest Chocolate',
]
# Alias que solo se quitan del texto del catálogo (también son topónimos: barrio
# Guachipelín de Escazú, Boulevard Selva Verde): no entran al denylist global.
SCRUB_ONLY_ALIASES = ['Guachipelín', 'Guachipelin', 'Selva Verde']
EXTRA_DOMAINS = ['alsamatourscr.com', 'misticopark.com', 'oceankingcr.com', 'graylinecostarica.com']
SHORT_GENERIC = {'atec', 'oet', 'ots', 'cct'}  # siglas: solo como palabra completa

# Títulos públicos neutrales cuando quitar el nombre del operador deja un título pobre.
TITLE_OVERRIDES = {
    'desafio-lost-canyon-canyoning': ('Canyoning en cañón privado de La Fortuna', 'Private Canyon Canyoning in La Fortuna'),
    'desafio-mambo-combo-canyoning-rafting': ('Combo canyoning + rafting Río Balsa', 'Canyoning + Balsa River Rafting Combo'),
    'desafio-puentes-colgantes-mistico-guiado': ('Caminata guiada por puentes colgantes de Arenal', 'Arenal Hanging Bridges Guided Walk'),
    'puretrek-canyoning-puentes-colgantes': ('Canyoning en cataratas + puentes colgantes', 'Waterfall Canyoning + Hanging Bridges'),
    'puretrek-canyoning-rafting': ('Canyoning en cataratas + rafting', 'Waterfall Canyoning + Rafting'),
    'sky-adventures-arenal-sky-trek': ('Canopy en El Castillo, Arenal', 'Ziplines in El Castillo, Arenal'),
    'selvatura-canopy': ('Canopy en bosque nuboso de Monteverde', 'Monteverde Cloud Forest Canopy'),
    'selvatura-puentes-colgantes': ('Puentes colgantes en bosque nuboso de Monteverde', 'Monteverde Cloud Forest Hanging Bridges'),
    'selvatura-habitat-perezosos': ('Hábitat de perezosos en Monteverde', 'Sloth Habitat in Monteverde'),
    'selvatura-mariposario': ('Jardín de mariposas en Monteverde', 'Butterfly Garden in Monteverde'),
    'selvatura-historia-natural': ('Caminata de historia natural en Monteverde', 'Monteverde Natural History Walk'),
    'selvatura-reptiles-anfibios': ('Exhibición de reptiles y anfibios en Monteverde', 'Monteverde Reptile & Amphibian Exhibit'),
    'original-canopy-tour-monteverde': ('Canopy clásico en Santa Elena, Monteverde', 'Classic Canopy Tour in Santa Elena, Monteverde'),
    'kinkajou-night-walk': ('Caminata nocturna de fauna en Monteverde', 'Monteverde Wildlife Night Walk'),
    'treetopia-sky-trek': ('Canopy en Monteverde', 'Monteverde Ziplines'),
    'treetopia-tree-tram': ('Teleférico en bosque nuboso de Monteverde', 'Monteverde Cloud Forest Cableway'),
    'jaguar-rescue-tour-publico': ('Centro de rescate de fauna en Playa Chiquita: tour público', 'Wildlife Rescue Center in Playa Chiquita: Public Tour'),
    'jaguar-rescue-tour-privado': ('Centro de rescate de fauna en Playa Chiquita: tour privado', 'Wildlife Rescue Center in Playa Chiquita: Private Tour'),
    'pacuare-lodge-canopy': ('Canopy junto al río Pacuare', 'Canopy by the Pacuare River'),
    'pacuare-lodge-canyoning': ('Canyoning junto al río Pacuare', 'Canyoning by the Pacuare River'),
    'pacuare-lodge-experiencia-cabecar': ('Experiencia cultural cabécar en el Pacuare', 'Cabécar Cultural Experience on the Pacuare'),
    'combo-poas-doka-lapaz-expediciones': ('Combo Volcán Poás, tour de café y La Paz Waterfall Gardens', 'Combo: Poás Volcano, Coffee Tour & La Paz Waterfall Gardens'),
    'irazu-termales-orosi-expediciones': ('Volcán Irazú y aguas termales en Orosi', 'Irazú Volcano & Orosi Hot Springs'),
    'poas-doka-grecia-sarchi-expediciones': ('Volcán Poás, tour de café, Grecia y Sarchí', 'Poás Volcano, Coffee Tour, Grecia & Sarchí'),
    'doka-grecia-sarchi-expediciones': ('Tour de café, Grecia y Sarchí (fábrica de carretas)', 'Coffee Tour, Grecia & Sarchí (Oxcart Factory)'),
    'doka-poas-expediciones': ('Tour de café y Volcán Poás', 'Coffee Tour & Poás Volcano'),
    'doka-coffee-tour': ('Tour de café en Sabanilla de Alajuela', 'Coffee Tour in Sabanilla de Alajuela'),
    'doka-poas-hacienda-doka': ('Tour de café + Volcán Poás', 'Coffee Tour + Poás Volcano'),
    'britt-classic-coffee-tour': ('Tour clásico de café en Heredia', 'Classic Coffee Tour in Heredia'),
    'britt-coffee-waterfalls': ('Tour de café en Heredia + La Paz Waterfall Gardens', 'Heredia Coffee Tour + La Paz Waterfall Gardens'),
    'britt-coffee-adventure': ('Tour de café en Heredia + aventura', 'Heredia Coffee & Adventure Tour'),
    'buenavista-horseback': ('Cabalgata en Cañas Dulces, Rincón de la Vieja', 'Horseback Riding in Cañas Dulces, Rincón de la Vieja'),
    'crocodile-man-tour': ('Tour de cocodrilos en el río Tárcoles', 'Tárcoles River Crocodile Tour'),
    'safari-cocodrilos-tarcoles-jcs': ('Safari de cocodrilos en el río Tárcoles', 'Tárcoles River Crocodile Safari'),
    'surf-little-waves-jaco': ('Clase de surf en Playa Jacó', 'Surf Lesson in Playa Jacó'),
    'atv-kings-of-jaco': ('Tour en cuadraciclo en Jacó', 'ATV Tour in Jacó'),
    'bat-jungle-monteverde': ('Exhibición de murciélagos en Monteverde', 'Monteverde Bat Exhibit'),
    'maexpeditions-night-tour': ('Tour nocturno en Manuel Antonio', 'Manuel Antonio Night Tour'),
    'ara-manzanillo-macaw-visit': ('Visita a proyecto de lapa verde en Manzanillo', 'Great Green Macaw Project Visit in Manzanillo'),
    'sambola-canoe-tour': ('Tour en canoa por los canales de Tortuguero', 'Tortuguero Canals Canoe Tour'),
    'sambola-kayak-tour': ('Tour en kayak por los canales de Tortuguero', 'Tortuguero Canals Kayak Tour'),
    'okeanos-aggressor-ii-isla-del-coco': ('Buceo vivo a bordo Isla del Coco (barco A)', 'Cocos Island Liveaboard (boat A)'),
    'cocos-island-aggressor-isla-del-coco': ('Buceo vivo a bordo Isla del Coco (barco B)', 'Cocos Island Liveaboard (boat B)'),
    'fincaverde-puentes-heliconias': ('Puentes colgantes de Heliconias y tour de finca', 'Heliconias Hanging Bridges & Farm Tour'),
    'blue-falls-costa-rica-entrada': ('Cataratas azules de Bajos del Toro', 'Bajos del Toro Blue Waterfalls'),
    'batsu-entrada-fotografia': ('Entrada a jardín de aves para fotografía en San Gerardo de Dota', 'Birding & Photography Garden Ticket in San Gerardo de Dota'),
    'donlucas-coffee-tour-tarrazu': ('Coffee tour en Tarrazú', 'Coffee Tour in Tarrazú'),
    'crocodile-bridge-boat-tour': ('Tour en bote del Puente de los Cocodrilos', 'Boat Tour by the Tárcoles River Crocodile Bridge'),
    'rainforest-chocolate-tour': ('Tour de chocolate en La Fortuna', 'Chocolate Tour in La Fortuna'),
    'montanasagrada-pase-dia-pozo-verde': ('Pase del día a la laguna Pozo Verde', 'Day Pass to Pozo Verde Lagoon'),
}
PLACE_OVERRIDES = {}
REGION_PLACE = {'monteverde': 'Monteverde', 'arenal': 'La Fortuna, Arenal', 'pacuare': 'Río Pacuare',
                'perez_zeledon': 'San Gerardo de Rivas, Pérez Zeledón', 'sjo': 'Heredia', 'san_jose': 'San José'}


def num(v):
    try:
        f = float(str(v or '').replace(',', '').replace('$', '').strip())
        return f if f == f else None
    except ValueError:
        return None


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return re.sub(r'-{2,}', '-', s)[:80].strip('-')


def base_name(n):
    return re.sub(r'\s*\(.*?\)', '', n).strip()


def aliases_for(name):
    # Nombre completo y nombre sin paréntesis. Los paréntesis suelen ser lugares
    # ("(Bahía Drake)", "(Yorkín)"): los alias de marca van en EXTRA_ALIASES.
    out = {name.strip(), base_name(name)}
    return {a for a in out if a and a not in PUBLIC_PLACE_NAMES}


def domain(url):
    h = (urlparse(url).hostname or '').lower()
    return h[4:] if h.startswith('www.') else h


# ---------- lectura ----------
raw, skipped, seen = [], [], set()
for path in sorted(SRC.glob('*.csv')):
    with open(path, newline='', encoding='utf-8') as fh:
        for r in csv.DictReader(fh):
            slug = (r.get('id_slug') or '').strip()
            if not slug:
                continue
            if slug in SKIP:
                skipped.append({'id': slug, 'duplicate_of': SKIP[slug]}); continue
            if slug in seen:
                skipped.append({'id': slug, 'reason': 'id repetido'}); continue
            url = (r.get('url_fuente') or '').strip()
            if url.startswith('http://'):
                if any(h in url for h in NO_HTTPS):
                    skipped.append({'id': slug, 'reason': 'fuente sin https'}); continue
                url = 'https://' + url[len('http://'):]
            if not url.startswith('https://'):
                skipped.append({'id': slug, 'reason': 'sin url_fuente'}); continue
            notas = (r.get('notas') or '').strip()
            if notas.upper().startswith('RETIRAR'):
                skipped.append({'id': slug, 'reason': 'retirado: ' + notas[:80]}); continue
            if num(r.get('lat')) is None or num(r.get('lng')) is None:
                skipped.append({'id': slug, 'reason': 'sin coordenadas'}); continue
            seen.add(slug)
            raw.append((slug, url, notas, r))

prospects = json.loads(PROSPECTS.read_text(encoding='utf-8'))['operators']

# ---------- denylist ----------
names, domains = set(EXTRA_ALIASES), set(EXTRA_DOMAINS)
for _, url, _, r in raw:
    names |= aliases_for(r['operador'])
    if base_name(r['operador']) not in PUBLIC_PLACE_NAMES:  # web oficial de un lugar público: no es proveedor
        domains.add(domain(url))
for p in prospects:
    names |= aliases_for(p['name'])
    if p.get('website'):
        domains.add(domain(p['website']))
names = {n for n in names if len(n) >= 4 or n.lower() in SHORT_GENERIC}
ALIASES = sorted(names | set(SCRUB_ONLY_ALIASES), key=len, reverse=True)
ACCENTS = {'a': '[aáàä]', 'e': '[eéèë]', 'i': '[iíìï]', 'o': '[oóòö]', 'u': '[uúùü]', 'n': '[nñ]'}


def accent_pattern(a):
    base = unicodedata.normalize('NFKD', a).encode('ascii', 'ignore').decode()
    if len(base) != len(a):
        return re.escape(a)
    out = ''
    for ch in base:
        low = ch.lower()
        if low in ACCENTS:
            cls = ACCENTS[low]
            out += cls if ch == low else cls.upper()
        else:
            out += re.escape(ch)
    return out


def alias_re(a):
    # Sensible a mayúsculas: los nombres de operador son nombres propios ("Selva Verde"
    # no debe borrar "selva verde" descriptivo).
    return re.compile(r'(?<![\w])' + accent_pattern(a) + r'(?![\w])')


ALIAS_RES = [(a, alias_re(a)) for a in ALIASES]


def has_operator(text):
    return any(rx.search(text) for _, rx in ALIAS_RES)


def clean_place(place):
    segs = [s.strip() for s in re.split(r',|\s/\s|·', place) if s.strip()]
    keep = [s for s in segs if not has_operator(s)]
    return ', '.join(keep)


def scrub(text, town, lang):
    if not text:
        return text
    out = text
    for a, rx in ALIAS_RES:
        if not rx.search(out):
            continue
        p = accent_pattern(a)
        out = re.sub(r'\s*\([^()]*' + p + r'[^()]*\)', '', out)
        where = (' en ' if lang == 'es' else ' in ') + town if town else ''
        out = re.sub(r'\s+(?:en|in|at)\s+(?:el\s+|la\s+|the\s+)?(?:refugio\s+de\s+vida\s+silvestre\s+|reserva\s+)?' + p + r'(?![\w])', where, out)
        out = re.sub(r'\s+(?:con|de|by|with|from|por|del)\s+(?:el\s+|la\s+|the\s+)?' + p + r'(?![\w])', '', out)
        out = re.sub(r'^' + p + r'\s*[:\-–]?\s*', '', out)
        out = re.sub(r'\s*[:\-–]?\s*' + p + r'$', '', out)
        out = rx.sub('', out)
    out = re.sub(r'\s+([,.;])', r'\1', out)
    out = re.sub(r'([,;])\s*(?=[,;])', '', out)
    out = re.sub(r'\(\s*\)', '', out)
    out = re.sub(r'\s{2,}', ' ', out).strip(' -–:,+&')
    return out[:1].upper() + out[1:] if out else out


# ---------- salida ----------
public_rows, internal_rows, legacy, used_ids, poor = [], [], {}, set(), []
for slug, url, notas, r in raw:
    op = r['operador'].strip()
    place_raw = (r.get('lugar') or '').strip()
    place = PLACE_OVERRIDES.get(slug) or clean_place(place_raw) or REGION_PLACE.get(r['region'].strip(), 'Costa Rica')
    town = place.split(',')[0].strip() if place else ''
    title_es = scrub(r['titulo_es'].strip(), town, 'es')
    title_en = scrub((r.get('titulo_en') or '').strip() or r['titulo_es'].strip(), town, 'en')
    desc_es = scrub((r.get('descripcion_es') or '').strip(), town, 'es')
    desc_en = scrub((r.get('descripcion_en') or '').strip() or (r.get('descripcion_es') or '').strip(), town, 'en')
    if slug in TITLE_OVERRIDES:
        title_es, title_en = TITLE_OVERRIDES[slug]
    includes = [scrub(s.strip(), town, 'es') for s in (r.get('incluye') or '').split(';') if s.strip()]
    nid = slugify(title_es) or slugify(r['region'] + '-' + r['categoria'])
    if nid in used_ids:
        nid = f"{nid}-{slugify(r['region'])}"
    n = 2
    while nid in used_ids:
        nid = f"{nid.rsplit('-', 1)[0] if n > 2 else nid}-{n}"; n += 1
    used_ids.add(nid)
    legacy['op-' + slug] = nid

    price = num(r.get('precio_usd_adulto'))
    price_note = None
    if price is None or price <= 0:
        price, price_note = 0, 'sin_precio_publicado'
    elif GROUP_PRICE.search(notas):
        price_note = f'precio_por_grupo_o_bote:{price:g}'
        price = 0
    child, hours, age = num(r.get('precio_usd_nino')), num(r.get('duracion_horas')), num(r.get('edad_minima'))
    for label, value in (('titleEs', title_es), ('titleEn', title_en), ('placeName', place)):
        if len(value) < (3 if label == 'placeName' else 6) or re.match(r'^[+(&]|^and\b', value, re.I) or re.search(r'\b(de|desde|con|en|y|in|from|with|and)$', value):
            poor.append(f'{slug}: {label}={value!r}')
    item = {
        'id': nid, 'slug': nid,
        'titleEs': title_es, 'titleEn': title_en or title_es,
        'category': r['categoria'].strip(), 'region': r['region'].strip(),
        'placeName': place, 'lat': round(num(r['lat']), 4), 'lng': round(num(r['lng']), 4),
        'priceUSD': round(price, 2), 'durationHours': hours or 0,
        'difficulty': (r.get('dificultad') or '').strip() or 'por_confirmar',
        'descriptionEs': desc_es, 'descriptionEn': desc_en or desc_es, 'includes': includes,
    }
    if child is not None and price_note is None: item['childPriceUSD'] = round(child, 2)
    if age is not None: item['ageMinimum'] = int(age)
    if price_note: item['priceNote'] = price_note
    public_rows.append(item)

    nb = slugify(base_name(op))
    pr = next((p for p in prospects if slugify(base_name(p['name'])) == nb or (p.get('website') and domain(p['website']) == domain(url))), None)
    internal_rows.append({
        'id': nid, 'legacyId': 'op-' + slug, 'operatorName': op, 'sourceUrl': url,
        'priceSource': 'publicado_por_operador', 'priceCheckedAt': PRICE_CHECKED_AT,
        'publicTitleEs': title_es, 'originalTitleEs': r['titulo_es'].strip(), 'originalPlaceName': place_raw,
        'notes': notas or None,
        'contacts': {
            'prospectId': pr['id'] if pr else None,
            'website': (pr or {}).get('website') or f'https://{urlparse(url).hostname}/',
            'email': (pr or {}).get('email'), 'phoneWhatsapp': (pr or {}).get('phoneWhatsapp'),
        },
        'ictVerified': False,
    })

if poor:
    raise SystemExit('Texto pobre tras ocultar al operador; agregue TITLE_OVERRIDES/PLACE_OVERRIDES:\n  ' + '\n  '.join(poor))
leaks = [t['id'] for t in public_rows if has_operator(' '.join([t['titleEs'], t['titleEn'], t['descriptionEs'], t['descriptionEn'], t['placeName'], *t['includes']]))]
if leaks:
    raise SystemExit(f'operator names still present in public rows: {leaks[:10]}')

PUBLIC_OUT.write_text(json.dumps({
    'reviewedAt': PRICE_CHECKED_AT,
    'priceLabel': {'es': 'Precio de referencia, sujeto a confirmación', 'en': 'Reference price, subject to confirmation'},
    'tours': public_rows,
}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
INTERNAL_DIR.mkdir(parents=True, exist_ok=True)
INTERNAL_OUT.write_text(json.dumps({
    'warning': 'INTERNO: solo servidor. No importar desde src/ ni copiar a public/. La identidad del operador se revela al cliente solo en la confirmación de reserva.',
    'priceCheckedAt': PRICE_CHECKED_AT, 'tours': internal_rows,
}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
DENYLIST_OUT.write_text(json.dumps({
    'warning': 'INTERNO: nombres y dominios de operadores que nunca deben aparecer en el bundle público, public/ ni endpoints públicos.',
    'publicPlaceNames': sorted(PUBLIC_PLACE_NAMES), 'names': sorted(names, key=str.lower), 'domains': sorted(d for d in domains if d),
}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
LEGACY_OUT.write_text(json.dumps(legacy, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(f'{len(public_rows)} tours -> {PUBLIC_OUT.relative_to(ROOT)} (+ {INTERNAL_OUT.relative_to(ROOT)}); omitidos {len(skipped)}')
for s in skipped: print('  skip', s)
