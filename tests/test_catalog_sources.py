"""Research validation runs offline and never rewrites generated catalog files."""
import csv
from datetime import date
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("catalog_validation", ROOT / "scripts/catalog/source_validation.py")
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)


class CatalogSourcesTest(unittest.TestCase):
    def setUp(self):
        with (ROOT / "data/fuentes/catalogo/tanda4_2026_10_22.csv").open(encoding="utf-8", newline="") as fh:
            self.rows = list(csv.DictReader(fh))

    def test_new_batch_is_reviewed_and_distinct(self):
        self.assertEqual(len(self.rows), 30)
        self.assertEqual(len({r["id_slug"] for r in self.rows}), 30)
        self.assertEqual(len({(r["operador"], r["titulo_es"]) for r in self.rows}), 30)
        legacy_ids = set()
        for path in (ROOT / "data/fuentes/catalogo").glob("*.csv"):
            if path.name == "tanda4_2026_10_22.csv":
                continue
            with path.open(encoding="utf-8", newline="") as fh:
                legacy_ids.update(r["id_slug"] for r in csv.DictReader(fh))
        for row in self.rows:
            validation.validate_dated_row(row, today=date(2026, 10, 22))
            self.assertNotIn(row["id_slug"], legacy_ids)
            self.assertEqual(row["estado_precio"], "por_confirmar")
            self.assertEqual(row["precio_usd_adulto"], "")

    def test_rejects_bad_dates_sources_numbers_and_prices(self):
        invalid = [
            {"revisado_el": ""}, {"revisado_el": "2026-02-30"},
            {"revisado_el": "2027-01-01"}, {"revisado_el": "20261022"},
            {"url_fuente": "http://example.com"}, {"url_fuente": "https://user:secret@example.com"},
            {"lat": "nan"}, {"lat": "91"}, {"lng": "inf"}, {"lng": "-181"},
            {"duracion_horas": "-1"}, {"edad_minima": "NaN"},
            {"categoria": "invented"}, {"region": "invented"},
            {"titulo_en": ""}, {"descripcion_en": ""},
            {"precio_usd_adulto": "99"}, {"estado_precio": "confirmed"},
            {"id_slug": "not a slug"}, {None: ["shifted cell"]},
        ]
        for patch in invalid:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                validation.validate_dated_row({**self.rows[0], **patch}, today=date(2026, 10, 22))

    def test_legacy_rows_do_not_receive_a_new_review_date(self):
        validation.validate_dated_row({"id_slug": "legacy"})


if __name__ == "__main__":
    unittest.main()
