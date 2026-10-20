"""Quita de las capas públicas del mapa (public/data/mapa/*.geojson) todo dato de contacto
directo de negocios/proveedores: teléfono, WhatsApp, correo, web, enlaces de reserva externos
y dirección exacta de negocios. La plataforma gestiona cada solicitud (botón
"Solicitar / consultar con nosotros").

Decisión del dueño (Jose, 2026-10-19). Excepción: servicios de emergencia públicos
(911, CCSS, hospitales, policía, bomberos, Cruz Roja) conservan su teléfono público oficial.

Idempotente. Uso: python3 scripts/catalog/strip_public_business_contacts.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]

# Capas cuyo teléfono público oficial puede mostrarse (emergencias y red pública de salud).
EMERGENCY_LAYERS = {'emergencia', 'ccss'}
# En "salud" solo los hospitales son excepción (farmacias y clínicas privadas son negocios).
EMERGENCY_TYPES = {('salud', 'Hospital')}
# Capas de negocios: además del contacto se retira la dirección exacta (queda el punto aproximado).
BUSINESS_LAYERS = {'alimentacion', 'hospedaje', 'servicios', 'atracciones', 'cultura', 'transporte', 'salud'}

CONTACT_KEYS = {'telefono', 'phone', 'tel', 'whatsapp', 'email', 'correo', 'web', 'website', 'url',
                'reserva', 'booking', 'contact', 'contacto', 'fuente', 'facebook', 'instagram'}
CONTACT_LABEL = re.compile(r'^(contacto|contact|tel[eé]fono|phone|whatsapp|correo|e-?mail|web|sitio)', re.I)
EMAIL = re.compile(r'[\w.+-]+@[\w-]+(\.[\w-]+)+')
URL = re.compile(r'(https?://|www\.)\S+|\b[\w-]+\.(com|org|net|cr|go\.cr|ac\.cr|co)(/\S*)?\b', re.I)
YEAR_RANGE = re.compile(r'^(1[89]\d\d|20\d\d)[\s-](1[89]\d\d|20\d\d)$')
PHONE = re.compile(r'(\+?506[\s.-]?)?\b[2-8]\d{3}[\s.-]?\d{4}\b')


def has_phone(text: str) -> bool:
    return any(not YEAR_RANGE.match(m.group(0).strip()) for m in PHONE.finditer(text))


def scrub_text(text: str) -> str:
    text = EMAIL.sub('', text)
    text = URL.sub('', text)
    text = PHONE.sub(lambda m: m.group(0) if YEAR_RANGE.match(m.group(0).strip()) else '', text)
    text = re.sub(r'\b(por (correo|tel[eé]fono|tel\.?|whatsapp)|tel\.|correo|email)\s*(?=[,;)]|$)', '', text, flags=re.I)
    text = re.sub(r'\(\s*[,;:]?\s*\)', '', text)
    text = re.sub(r'\s+([.,;:)])', r'\1', text)
    text = re.sub(r'([.,;:])\1+', r'\1', text)
    text = re.sub(r'\(\s*[,;]\s*', '(', text)
    text = re.sub(r'[,;]\s*\)', ')', text)
    text = re.sub(r'[,;]\s*([,;])', r'\1', text)
    text = re.sub(r'\b(en|a|al|v[ií]a)\s+(?=(y|o)\b|[,.;)]|$)', '', text)
    return re.sub(r'\s{2,}', ' ', text).strip(' ,;:/')


def is_emergency(layer: str, props: dict) -> bool:
    return layer in EMERGENCY_LAYERS or (layer, props.get('tipo')) in EMERGENCY_TYPES


def scrub(layer: str, props: dict) -> int:
    changed = 0
    emergency = is_emergency(layer, props)
    for key in list(props):
        low = key.lower()
        if low in CONTACT_KEYS or low.startswith('contact'):
            if emergency and low in ('telefono', 'phone', 'tel', 'fuente'):
                continue  # teléfono público oficial y fuente institucional
            del props[key]; changed += 1
    if layer in BUSINESS_LAYERS and not emergency and 'direccion' in props:
        del props['direccion']; changed += 1
    if not emergency:
        for key in [k for k, v in props.items() if isinstance(v, str) and k not in ('id', 'grupo', 'tipo', 'nombre')]:
            value = props[key]
            if EMAIL.search(value) or URL.search(value) or has_phone(value):
                cleaned = scrub_text(value); changed += 1
                if cleaned: props[key] = cleaned
                else: del props[key]
    rows = props.get('detalles')
    if isinstance(rows, list) and not emergency:
        kept = []
        for row in rows:
            if not isinstance(row, dict):
                kept.append(row); continue
            label = f"{row.get('es', '')} {row.get('en', '')}".strip()
            value = str(row.get('v', ''))
            if CONTACT_LABEL.match(label):
                changed += 1; continue
            if EMAIL.search(value) or URL.search(value) or has_phone(value):
                cleaned = scrub_text(value)
                changed += 1
                if not cleaned:
                    continue
                row = {**row, 'v': cleaned}
            kept.append(row)
        props['detalles'] = kept
    return changed


def main() -> None:
    total = 0
    for path in sorted((ROOT / 'public/data/mapa').glob('*.geojson')):
        data = json.loads(path.read_text(encoding='utf-8'))
        changed = sum(scrub(path.stem, f.get('properties') or {}) for f in data['features'])
        if changed:
            path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
            print(f'{path.name}: -{changed} datos de contacto/dirección')
        total += changed
    print(f'total retirado: {total}')


if __name__ == '__main__':
    main()
