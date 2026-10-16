"""Convierte los CSV de investigación (data/fuentes/catalogo/*.csv, ver SPEC.md) en src/data/operatorTours.json.

Uso: python3 scripts/catalog/build_operator_tours.py [dir_csv] [salida]
Solo usa precios publicados por el operador en su propia página (url_fuente).
Incluye automáticamente cualquier CSV nuevo del directorio (tandas futuras).
"""
import csv, json, re, sys, pathlib

SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('data/fuentes/catalogo')
OUT = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path('src/data/operatorTours.json')
# Mismo operador y producto que un tour ya existente en toursCatalog.ts
SKIP = {
    'guachipelin-one-day-adventure-pass': 'guanacaste-guachipelin-combo',
    'diamante-adventure-pass': 'guanacaste-diamante-adventure',
    'marlindelrey-catamaran-tamarindo': 'guanacaste-marlin-del-rey-sunset',
    'puretrek-canyoning': 'arenal-pure-trek-canyoning',
    'aventura-canopy-monteverde': 'monteverde-100-aventura-extreme',
    'don-juan-3en1-cafe-chocolate-cana': 'coffee-chocolate-tour',
}
NO_HTTPS = ('terraventuras.com',)  # sitios sin HTTPS (verificado 2026-10-14)
GROUP_PRICE = re.compile(r'por bote|per boat|por grupo|per group', re.I)

def num(v):
    try:
        f = float(str(v or '').replace(',', '').replace('$', '').strip())
        return f if f == f else None
    except ValueError:
        return None

rows, skipped, seen = [], [], set()
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
            price = num(r.get('precio_usd_adulto'))
            price_note = None
            if price is None or price <= 0:
                price, price_note = 0, 'sin_precio_publicado'
            elif GROUP_PRICE.search(notas):
                price_note = f'precio_por_grupo_o_bote:{price:g}'
                price = 0
            child = num(r.get('precio_usd_nino'))
            hours = num(r.get('duracion_horas'))
            age = num(r.get('edad_minima'))
            lat, lng = num(r.get('lat')), num(r.get('lng'))
            if lat is None or lng is None:
                skipped.append({'id': slug, 'reason': 'sin coordenadas'}); continue
            seen.add(slug)
            item = {
                'id': 'op-' + slug,
                'titleEs': r['titulo_es'].strip(), 'titleEn': (r.get('titulo_en') or '').strip() or r['titulo_es'].strip(),
                'category': r['categoria'].strip(), 'region': r['region'].strip(),
                'placeName': (r.get('lugar') or '').strip(), 'lat': round(lat, 4), 'lng': round(lng, 4),
                'operatorName': r['operador'].strip(), 'sourceUrl': url,
                'priceUSD': round(price, 2),
                'durationHours': hours or 0,
                'difficulty': (r.get('dificultad') or '').strip() or 'por_confirmar',
                'descriptionEs': (r.get('descripcion_es') or '').strip(),
                'descriptionEn': (r.get('descripcion_en') or '').strip() or (r.get('descripcion_es') or '').strip(),
                'includes': [s.strip() for s in (r.get('incluye') or '').split(';') if s.strip()],
            }
            if child is not None and price_note is None: item['childPriceUSD'] = round(child, 2)
            if age is not None: item['ageMinimum'] = int(age)
            if price_note: item['priceNote'] = price_note
            rows.append(item)

OUT.write_text(json.dumps({'priceCheckedAt': '2026-10-14', 'priceSource': 'publicado_por_operador', 'tours': rows}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'{len(rows)} tours -> {OUT}; omitidos {len(skipped)}')
for s in skipped: print('  skip', s)
