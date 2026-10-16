"""Escribe en vercel.json los redirects 301 de ids antiguos de tours (que contenían el
nombre del operador) hacia los ids neutrales. Fuente: data/internal/legacyTourIds.json
(generado por build_operator_tours.py) y data/internal/legacyCuratedTourIds.json.
Uso: python3 scripts/catalog/write_tour_redirects.py
"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
legacy = {}
for name in ('legacyTourIds.json', 'legacyCuratedTourIds.json'):
    legacy.update(json.loads((ROOT / 'data/internal' / name).read_text(encoding='utf-8')))
cfg_path = ROOT / 'vercel.json'
cfg = json.loads(cfg_path.read_text(encoding='utf-8'))
redirects = [r for r in cfg.get('redirects', []) if not str(r.get('source', '')).startswith('/tour/')]
for old, new in sorted(legacy.items()):
    if old != new:
        redirects.append({'source': f'/tour/{old}', 'destination': f'/tour/{new}', 'statusCode': 301})
ordered = {}
for k, v in cfg.items():
    if k == 'rewrites':
        ordered['redirects'] = redirects
    if k != 'redirects':
        ordered[k] = v
cfg_path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(redirects)} redirects')
